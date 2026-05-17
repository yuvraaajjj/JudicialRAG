from typing import TypedDict, List, Dict, Any
from flask import jsonify
from langchain_core.documents import Document
from langgraph.graph import StateGraph, END
from langchain_community.vectorstores import FAISS
from langchain_ollama import OllamaEmbeddings, OllamaLLM
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
db_dir = BASE_DIR / "db" / "faiss"

embeddings = OllamaEmbeddings(model="embeddinggemma")

vector = FAISS.load_local(
    db_dir,
    embeddings,
    allow_dangerous_deserialization=True
)

retriever = vector.as_retriever(
    search_type = "similarity",
    search_kwargs = {"k": 5}
)

class RAGState(TypedDict, total=False):
    question: str
    document: List[Dict[str, Any]]
    verified: bool
    answer: str
    citations: List[Dict[str, Any]]
    validation: str
    approved: bool

def retrive_node(state: RAGState):
    docs = retriever.invoke(state["question"])

    serializable_docs = []
    for doc in docs:
        serializable_docs.append({
            "page_content": doc.page_content,
            "metadata": doc.metadata
        })

    new_state = dict(state)
    new_state["document"] = serializable_docs
    return new_state

llm = OllamaLLM(model="nemotron-3-nano:30b-cloud")

def verify_node(state: RAGState):
    if not state["document"]:
        return {"verified": False}
    
    joined_text = "\n".join(doc["page_content"] for doc in state["document"])

    prompt = f"""
        You are verifying whether a legal question can be answered
        using ONLY the text below.

        Text:
        {joined_text}

        Question:
        {state['question']}

        Answer ONLY with:
        - YES (if the text contains a clear answer)
        - NO (if it does not)
    """

    result = llm.invoke(prompt).strip().upper()

    new_state = dict(state)
    new_state["verified"] = (result == "YES")
    return new_state

def answer_node(state: RAGState):
    context = ""
    citations = []
    for i, doc in enumerate(state["document"]):
        context += f"\nSource{i+1}: {doc['page_content']}\n"

    for i, doc in enumerate(state["document"]):
        citations.append(doc["metadata"])

    prompt = f"""
        You are a legal research assistant trained in Indian law.

        STRICT RULES:
        1. Answer ONLY using the information contained in the Sources below.
        2. Do NOT invent statutes, rules, or case law.
        3. If the Sources do not clearly support a point, say: "Answer not found in the provided sources."
        4. Cite source numbers in square brackets after every legal rule or conclusion.
        5. If a procedural rule or statutory provision is mentioned, ensure it is correctly named and accurately applied.
        6. Do NOT confuse different procedural provisions (e.g., do not confuse Order XXIII with Order XIII).

        Sources:
        {context}

        Question:
        {state['question']}

        TASK:
        - Provide a clear and structured answer grounded strictly in the Sources.
        - First, state the legal rule or principle.
        - Then, explain it in simple, plain language suitable for a non-lawyer.
        - Finally, explain how this rule helps the user decide what to do next.

        OUTPUT FORMAT:
        - Use short headings where helpful.
        - Avoid unnecessary legal jargon.
        - Keep the explanation detailed enough for understanding, but focused on decision-making.
        - If multiple conditions apply, list them clearly.

        If the answer cannot be fully supported by the Sources, explicitly state what is missing.
    """

    answer = llm.invoke(prompt)

    new_state = dict(state)
    new_state["answer"] = answer
    new_state["citations"] = citations

    return new_state

def judge_node(state: RAGState):
    source = ""

    for i,doc in enumerate(state["document"]):
        source += f"\nSource{i+1} = {doc['page_content']}\n"
    
    prompt = f"""

        You are a Judge-Mode Legal Validator.

        ROLE:
        You are acting as a senior judge and procedural law expert in Indian civil law.

        STRICT OBJECTIVES:
        1. Verify that all legal provisions cited are correct and accurately applied.
        2. Detect doctrinal errors, including:
        - Wrong CPC / Limitation Act provisions
        - Confusion between jurisdiction, maintainability, and merits
        - Misuse of limitation law
        - Overstatement of judicial discretion
        3. Identify statements that could mislead a litigant.
        4. Decide whether the answer is safe to show to a user.

        DO NOT:
        - Add new law or case law
        - Rewrite the answer
        - Assume facts not present in the sources

        INPUTS:

        User Question:
        {state['question']}

        Generated Answer:
        {state['answer']}

        Sources:
        {source}

        TASKS:
        A. List all legal provisions referenced.
        B. Verify correctness and application of each.
        C. Identify doctrinal errors or ambiguities.
        D. Decide safety for end-user consumption.

        FINAL OUTPUT FORMAT (MANDATORY):

        VALIDATION RESULT:
        - Status: APPROVED / APPROVED WITH WARNINGS / REJECTED
        - Confidence Score: (0–100)

        ERRORS (if any):
        - [Provision / Concept]: Explanation

        WARNINGS (if any):
        - Explanation

        RECOMMENDATION:
        - Show as-is / Show with disclaimer / Regenerate answer
    """

    validation = llm.invoke(prompt)
    val = validation.upper()

    approved = (
        "STATUS: APPROVED" in val or
        "STATUS: APPROVED WITH WARNINGS" in val
    )

    new_state = dict(state)
    new_state["validation"] = validation
    new_state["approved"] = approved

    return new_state

def api_node(state: RAGState):
    clean_citations = []

    for meta in state["citations"]:
        clean_citations.append({
            "court": meta.get("court"),
            "case_numbers": meta.get("case_numbers"),
            "date_of_decision": meta.get("date_of_decision"),
            "judges": meta.get("judges"),
            "source_file": meta.get("source_file"),
        })

    new_state = dict(state)
    new_state["citations"] = clean_citations
    return new_state

graph = StateGraph(RAGState)

graph.add_node("retrieve", retrive_node)
graph.add_node("verify", verify_node)
graph.add_node("answer", answer_node)
graph.add_node("judge",judge_node)
graph.add_node("api", api_node)

graph.set_entry_point("retrieve")
graph.add_edge("retrieve", "verify")

# def route_after_verify(state: RAGState):
#     return "answer" if state["verified"] else END

# graph.add_conditional_edges(
#     "verify",
#     route_after_verify
# )
graph.add_edge("verify", "answer")
graph.add_edge("answer", "judge")
graph.add_edge("judge", "api")
graph.add_edge("api", END)

app = graph.compile()

def state_to_dict(state):
    return {
        "question": state.get("question"),
        "answer": state.get("answer"),
        "approved": state.get("approved"),
        "validation": state.get("validation"),
        "citations": state.get("citations"),
    }


# if result.get("approved"):
#     print(result.get("approved"))
#     print(result.get("answer","Not Found"))
#     print("\nCITATIONS")
#     for i, meta in enumerate(result.get("citation", []), start=1):
#         print(f"\n[Citation {i}]")
#         print(f"Court: {meta.get('court')}")
#         print(f"Case No: {meta.get('case_numbers')}")
#         print(f"Date of Decision: {meta.get('date_of_decision')}")
#         print(f"Judge(s): {meta.get('judges')}")
#         print(f"Source File: {meta.get('source_file')}")
#         print(f"Chunk ID: {meta.get('chunk_id')}")
# else:
#     print("⚠️ Answer withheld due to legal validation issues.")
#     print("\nJUDGE MODE FEEDBACK:\n")
#     print(result.get("validation"))
