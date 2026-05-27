# 🤖 AI-Powered Web Intelligence & Autonomous CLI Agent

This repository contains an advanced, two-part system designed for programmatic web perception, visual reconstruction, and autonomous agentic task execution.

```
├── code/                         # Autonomous CLI ReAct Agent (Node.js)
└── UniversalBrowserEngine/       # Web Interface Perception & Extraction Engine
    ├── extension/                # Chrome Manifest V3 Extractor
    └── server/                   # FastAPI Normalization & Ingestion Server
```

---

## 🚀 Component 1: Autonomous ReAct CLI Agent (`/code`)

An autonomous command-line agent implemented in Node.js that runs a structured **ReAct (Reasoning and Acting)** loop to scrape, analyze, and visually reconstruct target websites.

### Key Features
* **ReAct Loop Execution**: Iteratively thinks (`THINK`), dispatches commands/functions (`TOOL`), observes output (`OBSERVE`), and produces final results (`OUTPUT`).
* **Groq SDK Integration**: Powered by Groq's high-speed inference engine using the `llama-3.1-8b-instant` model.
* **Token Optimization & Resiliency**: Built-in context truncation and intelligent exponential backoff retry logic to handle rate limits (HTTP 429).
* **Test Suite**: A cost-efficient test suite (`test.js`) containing both zero-cost unit tests and lightweight integration tests.

### Getting Started

1. **Navigate to the agent directory:**
   ```bash
   cd code
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env` file based on `.env.example` and add your Groq API key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
4. **Run the CLI Agent:**
   ```bash
   npm start
   ```
5. **Run Tests:**
   ```bash
   npm test
   ```

---

## 🌐 Component 2: Universal Browser Intelligence Engine (`/UniversalBrowserEngine`)

Traditional scrapers rely on brittle selectors (`.button-primary`). The **Universal Browser Intelligence Engine** bypasses this limitation by treating any webpage as a spatial, visual canvas. It translates live web interfaces into structured, AI-ready datasets.

### A. The Extractor (Chrome Manifest V3 Extension)
Operates directly inside the browser to extract ground-truth styling, geometry, and accessibility trees.
* **Visual Bounding Boxes**: Maps the coordinates (`x`, `y`, `width`, `height`) of all visible elements.
* **Semantic Layer**: Extracts roles and states from the browser accessibility tree (ARIA attributes).
* **Inherited CSS Variables**: Scrapes computed variables and styles to extract theme colors and typography.
* **Live Screenshot**: Captures a base64-encoded viewport screenshot.

### B. The Ingestion Server (FastAPI Python Server)
A FastAPI backend that ingests payloads from the extension, processes them, and formats them into an optimized prompt for Multimodal VLMs.
* **Normalization Engine**: Automatically filters out invisible nodes, `div` soup, and zero-pixel spacers.
* **VLM Prompt Assembly**: Contextualizes the parsed `UIComponentTree` and design tokens into a prompt ready for models like GPT-4o, Claude 3.5 Sonnet, or Gemini Pro.

### Getting Started

#### 1. Launch the FastAPI Server
1. Navigate to the server directory:
   ```bash
   cd UniversalBrowserEngine/server
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application:
   ```bash
   python main.py
   ```
   *The server runs locally at `http://localhost:8000`.*

#### 2. Install the Chrome Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** (top-left).
4. Select the `UniversalBrowserEngine/extension` directory.

#### 3. Analyze Any Page
1. Visit any target website in Chrome.
2. Click the **UI Extractor** extension icon in your browser toolbar.
3. Click **Extract UI & Send**.
4. The running FastAPI console will log the received, cleaned component trees.

---

## 🔒 License
This project is licensed under the MIT License.
