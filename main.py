"""
PDF RAG Chatbot — FastAPI Backend
Serves the frontend and exposes API endpoints for PDF upload & question answering.
"""

import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from rag_engine import process_pdf, ask_question, reset_session

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="PDF RAG Chatbot", version="1.0.0")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs("static", exist_ok=True)


# ── Models ───────────────────────────────────────────────────────────────────
class QuestionRequest(BaseModel):
    question: str


class AnswerResponse(BaseModel):
    answer: str


class UploadResponse(BaseModel):
    message: str
    filename: str
    total_pages: int
    total_chunks: int
    total_characters: int


# ── API Routes ───────────────────────────────────────────────────────────────
@app.post("/upload-pdf", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF, extract text, generate embeddings, and build vector store."""

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    try:
        result = process_pdf(file_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    return UploadResponse(
        message="PDF processed successfully!",
        filename=file.filename,
        **result,
    )


@app.post("/ask", response_model=AnswerResponse)
async def ask(request: QuestionRequest):
    """Ask a question about the uploaded PDF."""

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        answer = ask_question(request.question)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get answer: {str(e)}")

    return AnswerResponse(answer=answer)


@app.post("/reset")
async def reset():
    """Reset the session — clears vector store and chat history."""
    reset_session()
    return {"message": "Session reset successfully."}


# ── Serve Frontend ───────────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def serve_frontend():
    return FileResponse("static/index.html")
