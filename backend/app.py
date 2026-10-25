from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from similarity import calculate_similarity

app = Flask(__name__)

# Allow requests from common local development origins.
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://127.0.0.1:5500",
                "http://localhost:5500",
                "http://127.0.0.1:5000",
                "http://localhost:5000"
            ]
        }
    }
)

# Maximum combined upload size: 2 MB.
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".py", ".java", ".c", ".cpp", ".h", ".hpp",
    ".js", ".ts", ".txt", ".go", ".php", ".rb",
    ".cs", ".html", ".css"
}


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Code Similarity Analyzer API is running."
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "message": "Backend is ready."
    })


@app.route("/api/compare", methods=["POST"])
def compare():
    # Check that both upload fields exist.
    if "file1" not in request.files or "file2" not in request.files:
        return jsonify({
            "error": "Upload both files using fields file1 and file2."
        }), 400

    file1 = request.files["file1"]
    file2 = request.files["file2"]

    if not file1.filename or not file2.filename:
        return jsonify({
            "error": "Both files must have filenames."
        }), 400

    # Validate file extensions.
    ext1 = Path(file1.filename).suffix.lower()
    ext2 = Path(file2.filename).suffix.lower()

    if ext1 not in ALLOWED_EXTENSIONS or ext2 not in ALLOWED_EXTENSIONS:
        return jsonify({
            "error": "Unsupported file type. Upload source code or text files."
        }), 400

    # Read files as UTF-8 text without saving them to disk.
    try:
        code1 = file1.read().decode("utf-8-sig")
        code2 = file2.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        return jsonify({
            "error": "Files must be valid UTF-8 text."
        }), 400

    if not code1.strip() or not code2.strip():
        return jsonify({
            "error": "Both files must contain non-empty source code."
        }), 400

    try:
        score = calculate_similarity(code1, code2)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    return jsonify({
        "similarity": score,
        "message": "Code similarity analysis completed.",
        "file1": Path(file1.filename).name,
        "file2": Path(file2.filename).name,
        "algorithm": "Character n-gram TF-IDF with cosine similarity"
    })


@app.errorhandler(413)
def file_too_large(error):
    return jsonify({
        "error": "The combined upload size exceeds the 2 MB limit."
    }), 413


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "An internal server error occurred."
    }), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)