from typing import TypedDict, List, Dict, Any
from langchain_core.documents import Document
from langgraph.graph import StateGraph, END
from langchain_community.vectorstores import FAISS
from langchain_ollama import OllamaEmbeddings, OllamaLLM
import os

curr_dir = os.path.dirname(os.path.abspath(__file__))
db_dir = os.path.join(curr_dir, "db", "faiss")

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

class RAGState(TypedDict):
    question: str
    document: List[Document]
    verified: bool
    answer: str
    citation: List[Dict[str, Any]]

def retrive_node(state: RAGState):
    docs = retriever.invoke(state["question"])
    return {
        "document": docs
    }

llm = OllamaLLM(model="nemotron-3-nano:30b-cloud")

def verify_node(state: RAGState):
    if not state["document"]:
        return {"verified": False}
    
    joined_text = "\n".join(doc.page_content for doc in state["document"])

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

    return{
        "verified": result == "YES"
    }

def answer_node(state: RAGState):
    context = ""
    citations = []
    for i, doc in enumerate(state["document"]):
        context += f"\nSource{i+1}: {doc.page_content}\n"

    for i, doc in enumerate(state["document"]):
        citations.append(doc.metadata)

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

    return {
        "answer": answer,
        "citation": citations
    }

graph = StateGraph(RAGState)

graph.add_node("retrieve", retrive_node)
graph.add_node("verify", verify_node)
graph.add_node("answer", answer_node)

graph.set_entry_point("retrieve")
graph.add_edge("retrieve", "verify")

def route_after_verify(state: RAGState):
    return "answer" if state["verified"] else END

graph.add_conditional_edges(
    "verify",
    route_after_verify
)

graph.add_edge("answer", END)

app = graph.compile()

result = app.invoke({
    "question": "Under what circumstances will a court allow withdrawal of a suit with liberty to file again??"
})

print(result.get("answer","Not Found"))
print("\nCITATIONS")
for i, meta in enumerate(result.get("citation", []), start=1):
    print(f"\n[Citation {i}]")
    print(f"Court: {meta.get('court')}")
    print(f"Case No: {meta.get('case_numbers')}")
    print(f"Date of Decision: {meta.get('date_of_decision')}")
    print(f"Judge(s): {meta.get('judges')}")
    print(f"Source File: {meta.get('source_file')}")
    print(f"Chunk ID: {meta.get('chunk_id')}")