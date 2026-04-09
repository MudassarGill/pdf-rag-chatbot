# PDF RAG Chatbot 🚀

A highly polished, full-stack AI web application that enables you to upload PDF documents and ask questions about their content using **Retrieval-Augmented Generation (RAG)**. The app boasts a premium glassmorphism dark-theme HTML/CSS/JS frontend powered by a FastAPI backend.

It utilizes 100% free vector embeddings running locally (`all-MiniLM-L6-v2` via HuggingFace) alongside Google's generous free tier Gemini AI for answer generation.

## Features ⭐
- **Premium Frontend:** Glassmorphism design, sleek loading animations, dynamic chat boxes, and fully responsive layout.
- **RAG Architecture:** Automatically extracts text from uploaded PDFs, chunks it, embeds it, and stores the vectors in a temporary FAISS database.
- **Conversational AI:** Features ongoing chat memory mapping so follow-up contextual questions can be natively understood.
- **Zero-Cost Embeddings:** Employs local transformer inference instead of paid APIs for generating embedding chunks.

## How to Run & Test 🧪

### 1. Configure the `.env` file
1. You should already see a `.env` file in the root folder of this codebase.
2. Get your free Google API key from [Google AI Studio](https://aistudio.google.com/).
3. Paste the key inside the `.env` file like this:
   ```env
   GOOGLE_API_KEY=AIzaSy...your-key...
   ```

### 2. Start the Backend Server
This project uses a python virtual environment `venv` which already contains all the downloaded dependencies. Start the FastAPI server using `uvicorn`:

1. Open a terminal in this project folder.
2. Activate the virtual environment (Windows Powershell):
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   *(If you are using Command Prompt instead, run `.\venv\Scripts\activate.bat`)*
3. Start the FastAPI server:
   ```powershell
   uvicorn main:app --reload
   ```
4. You should see an output like: `Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)`

### 3. Open the Frontend
1. Open your web browser and navigate to: **[http://localhost:8000](http://localhost:8000)**
2. The premium UI will load instantly.
3. Drag and drop any PDF into the sidebar.
4. Watch the progress bar as the AI reads and indexes your file.
5. Once complete, chat with your PDF!

## Known Limitations / Troubleshooting
- **No API Key:** If you don't enter a valid Google API key in `.env` before chatting, the application will display a red error toast telling you the authentication failed. Make sure to restart the `uvicorn` server after adding your key!
- **Changing PDFs:** If you want to chat with a new PDF, just click the "refresh / reset" circle button next to the filename on the sidebar. This will clear the session's vector store database and let you upload a completely new file.

---
*Powered by FastAPI, LangChain, FAISS, and Gemini 2.0 Flash.*
