"""
RAG Engine — Core pipeline for PDF processing, embedding, and question answering.
Uses HuggingFace embeddings (free, local) and Google Gemini API (free tier) for LLM.
"""

import os
from typing import Optional
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from dotenv import load_dotenv

load_dotenv()

# ── Globals ──────────────────────────────────────────────────────────────────
vector_store: Optional[FAISS] = None
conversation_chain = None
chat_memory = ConversationBufferWindowMemory(
    memory_key="chat_history",
    return_messages=True,
    output_key="answer",
    k=10,
)

# ── Embedding model (free, runs locally) ─────────────────────────────────────
embedding_model = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file."""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


def chunk_text(text: str) -> list[str]:
    """Split text into overlapping chunks for better retrieval."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)


def build_vector_store(chunks: list[str]) -> FAISS:
    """Create a FAISS vector store from text chunks."""
    global vector_store
    vector_store = FAISS.from_texts(texts=chunks, embedding=embedding_model)
    return vector_store


def get_conversation_chain():
    """Build the conversational retrieval chain using Gemini."""
    global conversation_chain, vector_store

    if vector_store is None:
        raise ValueError("No PDF has been processed yet. Please upload a PDF first.")

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        raise ValueError("Please set a valid GOOGLE_API_KEY in your .env file.")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=api_key,
        temperature=0.3,
        convert_system_message_to_human=True,
    )

    conversation_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
        memory=chat_memory,
        return_source_documents=False,
        output_key="answer",
    )
    return conversation_chain


def process_pdf(file_path: str) -> dict:
    """Full pipeline: extract → chunk → embed → store → build chain."""
    global conversation_chain

    # Reset memory for new document
    chat_memory.clear()

    text = extract_text_from_pdf(file_path)
    if not text.strip():
        raise ValueError("Could not extract any text from this PDF.")

    chunks = chunk_text(text)
    build_vector_store(chunks)
    conversation_chain = get_conversation_chain()

    return {
        "total_pages": len(PdfReader(file_path).pages),
        "total_chunks": len(chunks),
        "total_characters": len(text),
    }


def ask_question(question: str) -> str:
    """Ask a question against the processed PDF."""
    global conversation_chain

    if conversation_chain is None:
        raise ValueError("No PDF has been processed yet. Please upload a PDF first.")

    result = conversation_chain.invoke({"question": question})
    return result["answer"]


def reset_session():
    """Clear everything for a fresh start."""
    global vector_store, conversation_chain
    vector_store = None
    conversation_chain = None
    chat_memory.clear()
