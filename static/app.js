/**
 * PDF RAG Chatbot — Frontend Application Logic
 * Handles file uploads, chat interactions, and UI state management.
 */

// ── DOM Elements ────────────────────────────────────────────────────────────
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileMeta = document.getElementById('fileMeta');
const resetBtn = document.getElementById('resetBtn');
const statsSection = document.getElementById('statsSection');
const statPages = document.getElementById('statPages');
const statChunks = document.getElementById('statChunks');
const statChars = document.getElementById('statChars');
const chatMessages = document.getElementById('chatMessages');
const welcomeScreen = document.getElementById('welcomeScreen');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const statusBadge = document.getElementById('statusBadge');
const mobileToggle = document.getElementById('mobileToggle');
const sidebar = document.getElementById('sidebar');

// ── State ───────────────────────────────────────────────────────────────────
let isProcessing = false;
let isPdfLoaded = false;

// ── File Upload ─────────────────────────────────────────────────────────────

// Click to browse
dropzone.addEventListener('click', () => {
    if (!isProcessing) fileInput.click();
});

// File selected via browse
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

// Drag & Drop
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
    }
});

// Upload handler
async function handleFileUpload(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showError('Please upload a PDF file.');
        return;
    }

    if (isProcessing) return;
    isProcessing = true;

    // Show progress
    dropzone.classList.add('hidden');
    fileInfo.classList.add('hidden');
    statsSection.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading PDF...';

    // Animate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 85) {
            progress += Math.random() * 8;
            progressFill.style.width = `${Math.min(progress, 85)}%`;
        }
        if (progress > 30 && progress < 50) {
            progressText.textContent = 'Extracting text from PDF...';
        } else if (progress > 50 && progress < 70) {
            progressText.textContent = 'Generating embeddings...';
        } else if (progress >= 70) {
            progressText.textContent = 'Building vector index...';
        }
    }, 300);

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/upload-pdf', {
            method: 'POST',
            body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Upload failed');
        }

        const data = await response.json();

        // Complete progress
        progressFill.style.width = '100%';
        progressText.textContent = 'Processing complete!';

        setTimeout(() => {
            uploadProgress.classList.add('hidden');
            showFileInfo(file.name, data);
            enableChat();
        }, 600);

    } catch (error) {
        clearInterval(progressInterval);
        uploadProgress.classList.add('hidden');
        dropzone.classList.remove('hidden');
        showError(error.message || 'Failed to process PDF. Please try again.');
    } finally {
        isProcessing = false;
        fileInput.value = '';
    }
}

function showFileInfo(name, data) {
    fileName.textContent = name;
    fileMeta.textContent = `${data.total_pages} pages • ${data.total_chunks} chunks`;
    fileInfo.classList.remove('hidden');

    // Show stats
    statPages.textContent = data.total_pages;
    statChunks.textContent = data.total_chunks;
    statChars.textContent = formatNumber(data.total_characters);
    statsSection.classList.remove('hidden');
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function enableChat() {
    isPdfLoaded = true;
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.placeholder = 'Ask a question about your PDF...';
    chatInput.focus();

    // Update status badge
    statusBadge.innerHTML = '<span class="status-dot"></span> Document loaded — Ready';
    statusBadge.classList.add('active');

    // Hide welcome, show initial assistant message
    if (welcomeScreen) {
        welcomeScreen.remove();
    }

    addMessage('assistant', "I've analyzed your PDF and I'm ready to answer questions! What would you like to know?");
}

// ── Reset ───────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', async () => {
    try {
        await fetch('/reset', { method: 'POST' });
    } catch (e) { /* ignore */ }

    // Reset UI
    isPdfLoaded = false;
    fileInfo.classList.add('hidden');
    statsSection.classList.add('hidden');
    dropzone.classList.remove('hidden');
    chatInput.disabled = true;
    sendBtn.disabled = true;
    chatInput.placeholder = 'Upload a PDF first...';
    statusBadge.innerHTML = '<span class="status-dot"></span> No document loaded';
    statusBadge.classList.remove('active');

    // Clear chat
    chatMessages.innerHTML = `
        <div class="welcome-screen" id="welcomeScreen">
            <div class="welcome-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="url(#grad2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <defs>
                        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#6366f1"/>
                            <stop offset="100%" style="stop-color:#a855f7"/>
                        </linearGradient>
                    </defs>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <line x1="9" y1="10" x2="15" y2="10"/>
                    <line x1="12" y1="7" x2="12" y2="13"/>
                </svg>
            </div>
            <h2 class="welcome-title">Welcome to PDF Chat</h2>
            <p class="welcome-subtitle">Upload a PDF document to start asking questions.</p>
            <div class="welcome-features">
                <div class="feature-card">
                    <div class="feature-icon">📄</div>
                    <h3>Upload PDF</h3>
                    <p>Drag & drop or browse</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔍</div>
                    <h3>Smart Search</h3>
                    <p>AI finds relevant content</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">💬</div>
                    <h3>Chat Naturally</h3>
                    <p>Ask in plain language</p>
                </div>
            </div>
        </div>
    `;
});

// ── Chat ────────────────────────────────────────────────────────────────────

// Send on Enter
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Send on button click
sendBtn.addEventListener('click', sendMessage);

// Auto-resize textarea
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

async function sendMessage() {
    const question = chatInput.value.trim();
    if (!question || !isPdfLoaded || isProcessing) return;

    isProcessing = true;

    // Add user message
    addMessage('user', question);

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Show typing indicator
    const typingEl = showTypingIndicator();

    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
        });

        // Remove typing indicator
        typingEl.remove();

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to get answer');
        }

        const data = await response.json();
        addMessage('assistant', data.answer);

    } catch (error) {
        typingEl.remove();
        addMessage('assistant', `⚠️ Sorry, something went wrong: ${error.message}`);
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

function addMessage(role, content) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;

    const avatarText = role === 'user' ? 'U' : 'AI';

    // Simple markdown-like formatting
    const formattedContent = formatContent(content);

    messageEl.innerHTML = `
        <div class="message-avatar">${avatarText}</div>
        <div class="message-content">${formattedContent}</div>
    `;

    chatMessages.appendChild(messageEl);
    scrollToBottom();
}

function formatContent(text) {
    // Escape HTML
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Inline code: `code`
    html = html.replace(/`(.*?)`/g, '<code style="background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:4px;font-size:0.82em;">$1</code>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}

function showTypingIndicator() {
    const el = document.createElement('div');
    el.className = 'message assistant';
    el.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(el);
    scrollToBottom();
    return el;
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// ── Error Toast ─────────────────────────────────────────────────────────────
function showError(message) {
    // Remove existing toast
    const existing = document.querySelector('.error-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ── Mobile Sidebar Toggle ───────────────────────────────────────────────────
mobileToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});
