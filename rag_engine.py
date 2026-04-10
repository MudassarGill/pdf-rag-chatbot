"""
RAG Engine — Pure Python implementation using FAISS, Sentence-Transformers, and Google GenAI API.
Skipping Langchain to ensure 100% compatibility with Python 3.14.
"""

import os
import numpy as np
import faiss
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
from google import genai
from dotenv import load_dotenv

load_dotenv()

# ── Globals ──────────────────────────────────────────────────────────────────
index = None
text_chunks = []
chat_history = []
embedding_model = SentenceTransformer("all-MiniLM-L6-v2", device='cpu')

def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file."""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text

def chunk_text(text: str, chunk_size=1000, overlap=200) -> list[str]:
    """Manually split text into overlapping chunks."""
    words = text.replace('\n', ' ').split(' ')
    chunks = []
    current_chunk = []
    current_length = 0
    
    for word in words:
        if current_length + len(word) > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            # Keep the last few words for overlap
            overlap_words = []
            overlap_len = 0
            for w in reversed(current_chunk):
                if overlap_len + len(w) > overlap:
                    break
                overlap_words.insert(0, w)
                overlap_len += len(w) + 1
            current_chunk = overlap_words
            current_length = sum(len(w) + 1 for w in current_chunk)
            
        current_chunk.append(word)
        current_length += len(word) + 1
        
    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    return [c.strip() for c in chunks if c.strip()]

def build_vector_store(chunks: list[str]):
    """Create a FAISS vector store from text chunks using sentence-transformers."""
    global index, text_chunks
    text_chunks = chunks
    
    embeddings = embedding_model.encode(chunks)
    embeddings = np.array(embeddings).astype('float32')
    
    # FAISS Index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

def process_pdf(file_path: str) -> dict:
    """Full pipeline: extract → chunk → embed → store."""
    global chat_history
    chat_history = [] # Reset memory for new document
    
    text = extract_text_from_pdf(file_path)
    if not text.strip():
        raise ValueError("Could not extract any text from this PDF.")

    chunks = chunk_text(text)
    build_vector_store(chunks)

    return {
        "total_pages": len(PdfReader(file_path).pages),
        "total_chunks": len(chunks),
        "total_characters": len(text),
    }

def ask_question(question: str) -> str:
    """Perform similarity search and ask Google GenAI."""
    global index, text_chunks, chat_history
    
    if index is None or len(text_chunks) == 0:
        raise ValueError("No PDF has been processed yet. Please upload a PDF first.")

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        raise ValueError("Please set a valid GOOGLE_API_KEY in your .env file.")

    # 1. Embed query
    query_vector = embedding_model.encode([question])
    query_vector = np.array(query_vector).astype('float32')

    # 2. Search FAISS
    k = 4 # top 4 matches
    distances, indices = index.search(query_vector, k)
    
    context = ""
    for idx in indices[0]:
        if idx < len(text_chunks):
            context += text_chunks[idx] + "\n\n"

    # 3. Request LLM
    client = genai.Client(api_key=api_key)
    
    prompt = (
        f"You are a helpful AI assistant. Answer the question using ONLY the provided context from a document.\n"
        f"If the answer is not contained in the context, politely say you cannot find it.\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"QUESTION: {question}"
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        raise ValueError(f"Gemini API Error: {str(e)}")

def reset_session():
    """Clear everything for a fresh start."""
    global index, text_chunks, chat_history
    index = None
    text_chunks = []
    chat_history = []
