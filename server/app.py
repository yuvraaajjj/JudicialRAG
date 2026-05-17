from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from retriever.langgraph_retriever import app as rag_app, state_to_dict

app = Flask(__name__)
CORS(app, supports_credentials=True,origins=["http://localhost:5173"])
app.secret_key = os.urandom(24)
app.config.update(
    SESSION_COOKIE_SAMESITE='None',
    SESSION_COOKIE_SECURE=True
)

@app.route("/check", methods=["GET"])
def check():
    return jsonify({"status": "ok"})

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()

    if not data or "question" not in data:
        return jsonify({"error": "Require a question"}), 400
    
    question = data["question"]

    try:
        result = rag_app.invoke({
            "question": question
        })

        return jsonify(state_to_dict(result))
    except Exception as e:
        return jsonify({"error": f"Error processing question: {str(e)}"}), 500
    

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)