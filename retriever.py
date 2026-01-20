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

def retrieve_context(question):
    docs = retriever.invoke(question)
    return docs

llm = OllamaLLM(model="nemotron-3-nano:30b-cloud")

def answer(question):
    docs = retrieve_context(question)

    context = ""
    citations = []

    for i, doc in enumerate(docs):
        context += f"\nSource {i+1}:\n{doc.page_content}\n"
        citations.append(doc)

    prompt = f"""

You are a legal assistant.

Answer the question strictly using the sources below.
If the answer is not present, say "Answer not found in provided documents".

Sources:
{context}

Question:
{question}

Answer (mention source numbers):

"""
    
    answer = llm.invoke(prompt)

    return answer, citations

question = "WWhat role did Section 14(a)(ii) of the TRAI Act play in the Court’s decision to allow withdrawal of the suit?"

answer, sources = answer(question)

print("ANSWER:\n", answer)
print("\nCITATIONS:")
for i, meta in enumerate(sources):
    print(f"Source {i+1}:", meta.page_content)
