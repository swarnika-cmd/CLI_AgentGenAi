# 🌐 Universal Browser Intelligence Engine

> A generalized, multimodal, AI-driven architecture for perceiving, understanding, and reconstructing *any* arbitrary web interface.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Architecture](https://img.shields.io/badge/Architecture-Multimodal_VLM-blue)
![License](https://img.shields.io/badge/License-MIT-purple)

---

## 📖 The Vision: From Parsing to Perceiving

Traditional web scraping and automation rely on brittle CSS selectors (`.class-name`) or XPaths (`/div[2]/span`). This approach belongs to the Web 1.0 era. Modern websites are dynamic applications (React, Vue, SPAs, Shadow DOMs, Canvas) where classes are obfuscated and DOM structures change dynamically.

**The Universal Browser Engine solves this by stopping code parsing and starting visual perception.** 

Instead of feeding an AI a massive, token-heavy HTML string, this system:
1. Programmatically maps the visual geometry (`x`, `y`, `width`, `height`) of every element.
2. Extracts purely semantic data (Accessibility Trees: `Roles`, `States`).
3. Captures a high-resolution viewport screenshot.
4. Normalizes this data into a standardized `UIComponentTree`.
5. Feeds a Multimodal Vision-Language Model (VLM like GPT-4o or Gemini 1.5 Pro) the screenshot + the semantic tree to reason about the UI spatially—exactly how a human perceives the web.

---

## 🏗️ Architecture Overview

The system consists of two decoupled components communicating over HTTP:

### 1. 🧩 The Universal Extractor (Chromium Extension)
A Manifest V3 extension that operates directly in the browser to extract ground-truth rendering data without relying on static HTML parsing.
*   **Visual Ground Truth:** Captures a Base64 PNG of the live viewport.
*   **Coordinate Geometry:** Calculates exact bounding boxes for all visible nodes.
*   **Semantic Layer:** Extracts the Accessibility Tree (Roles, ARIA labels).
*   **Design Tokens:** Scrapes all inherited CSS Variables (`--colors`) and computed styles.

### 2. 🧠 The Intelligence Server (Python/FastAPI)
A blazing-fast ingestion server that normalizes the raw browser data into an AI-ready schema.
*   **Normalization Engine:** Filters out `<div>` soup, zero-pixel elements, and invisible nodes.
*   **VLM Prompting:** Dynamically injects the normalized `UIComponentTree` and Design Tokens into a strict, hallucination-free prompt template.
*   *(Designed to pipe directly into GPT-4o / Gemini Pro for code reconstruction or autonomous navigation)*.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (for the legacy CLI, if used)
*   Python 3.9+
*   Google Chrome or any Chromium-based browser

### 1. Start the Ingestion Server

Navigate to the `server` directory, install dependencies, and start the FastAPI server:

```bash
cd server
pip install -r requirements.txt
python main.py
```
*The server will start listening on `http://localhost:8000`.*

### 2. Install the Chromium Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** on (top right corner).
3. Click **Load unpacked**.
4. Select the `extension` folder from this repository.

### 3. Extract & Reconstruct

1. Navigate to **ANY** website on the internet (e.g., Stripe, Airbnb, a complex React dashboard).
2. Click the new `UI Extractor` extension icon in your toolbar.
3. Click **Extract UI & Send**.
4. Watch the Python server instantly receive, normalize, and prepare the multimodal payload for AI processing!

---

## ⚙️ The Universal Payload Schema

When the extension extracts a page, it POSTs a standardized, website-agnostic JSON payload. The Python server normalizes it into a structure like this:

```json
{
  "type": "UIComponent",
  "semantic_role": "button",
  "html_tag": "button",
  "content": "Add to Cart",
  "geometry": { "x": 120, "y": 450, "width": 200, "height": 48 },
  "visuals": {
    "background": "rgb(0, 123, 255)",
    "color": "rgb(255, 255, 255)",
    "font_family": "Inter, sans-serif",
    "border_radius": "8px"
  }
}
```
*Notice: Zero CSS selectors. Zero hardcoded classes. Pure semantic and spatial geometry.*

---

## 📜 The Golden Rules of the AI Prompt

The VLM prompt template strictly enforces the following principles to guarantee flawless, pixel-perfect reconstruction:

1.  **NO Hallucinations:** Never invent content not present in the payload.
2.  **NO Hardcoding:** The system must be entirely domain-agnostic.
3.  **Design Tokens First:** Always use extracted `css_variables`.
4.  **Geometry is Law:** Use the `element_boxes` to ensure layout proportions match perfectly.
5.  **Screenshot is Ground Truth:** Visual output must exactly match the provided image.

---

## 🛠️ Tech Stack

*   **Extension:** HTML/JS/CSS, Chrome Extension APIs (Manifest V3)
*   **Backend:** Python, FastAPI, Uvicorn, Pydantic
*   **AI Target:** Multimodal VLMs (GPT-4o, Gemini 1.5 Pro, Claude 3.5 Sonnet)

---
*Architected for the next generation of Agentic AI.*
