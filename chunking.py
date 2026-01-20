import os, json
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import FAISS

def parse_filename(filename: str):
    name = filename.replace(".txt", "")
    parts = name.split("_")

    return {
        "court_code": parts[0],
        "case_category": parts[1]
    }


curr_dir = os.path.dirname(os.path.abspath(__file__))
text_dir = ["commercial", "arbitration"]
meta_dir = os.path.join(curr_dir, "metadata")

documents = []

for folder in text_dir:
    folder_path = os.path.join(curr_dir, folder)

    for file in os.listdir(folder_path):
        if not file.endswith(".txt"):
            continue

        file_base = file.replace(".txt", "")

        text_path = os.path.join(folder_path, file)
        meta_path = os.path.join(meta_dir, f"{file_base}.json")

        with open(text_path, "r", encoding="utf-8") as f:
            text = f.read()
        
        metadata = {}

        metadata.update(parse_filename(file))

        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                metadata.update(json.load(f))

        metadata["source"] = file

        documents.append(
            Document(page_content=text, metadata=metadata)
        )


splitter = RecursiveCharacterTextSplitter(chunk_size = 550, chunk_overlap = 150)

docs = splitter.split_documents(documents)

print("----CHUNKS CREATED----")
print(f"Total Chunks = {len(docs)}")
print(f"Contents = \n{docs[1].page_content}")

for i, chunk in enumerate(docs):
    chunk.metadata["chunk_id"] = i

db_dir = os.path.join(curr_dir, "db", "faiss")

if not os.path.exists(db_dir):
    embeddings = OllamaEmbeddings(model="embeddinggemma")

    print("----EMBEDDINGS CREATED----")

    db = FAISS.from_documents(
        docs, embeddings
    )

    print("----FAISS CREATED----")
    print(f"Total Vectors = {db.index.ntotal}")
    db.save_local(db_dir)