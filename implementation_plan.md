# Migrate CLI Agent from OpenAI to Groq API

Switch the existing ReAct-loop CLI agent from OpenAI's API to Groq's free-tier API, add robust error handling, and create a cost-optimized test suite.

---

## User Review Required

> [!IMPORTANT]
> **API Key**: You'll need a Groq API key from [console.groq.com/keys](https://console.groq.com/keys). The code will read `GROQ_API_KEY` from `.env`.

> [!WARNING]
> **Free Tier Rate Limits**: Groq's free tier has tight limits. The model I'm choosing (`llama-3.1-8b-instant`) has **30 RPM / 14.4K RPD / 6K TPM / 500K TPD**. The agent loop makes multiple sequential calls, so a single "Clone Scaler" run could hit the TPM limit with large HTML payloads. I'll add truncation + rate-limit retry logic to handle this.

> [!IMPORTANT]  
> **`response_format: { type: "json_object" }` support**: Groq supports JSON mode. The current code uses this — I'll keep it as-is since Groq's API is OpenAI-compatible for this feature.

---

## Model Selection Strategy (Token Optimization)

| Role | Model | Why |
|------|-------|-----|
| **Agent reasoning** (THINK/TOOL/OUTPUT steps) | `llama-3.1-8b-instant` | Fastest, cheapest, 6K TPM on free tier. More than capable for structured JSON reasoning and tool dispatch. The agent doesn't need 70B-level intelligence — it follows a fixed protocol. |

> [!NOTE]
> Using `llama-3.3-70b-versatile` would give better reasoning but only **12K TPM** and **1K RPD** on free tier — too restrictive for an agent loop that makes 10-20+ API calls per task. The 8B model is the right trade-off: fast, high RPD (14.4K), and sufficient for structured step-following.

---

## Proposed Changes

### Dependencies

#### [MODIFY] [package.json](file:///d:/cli%20project%20website/code/package.json)
- Remove `openai` dependency
- Add `groq-sdk` dependency
- Add `"test"` script: `"node test.js"`

---

### Core Agent

#### [MODIFY] [index.js](file:///d:/cli%20project%20website/code/index.js)
Key changes:
1. Replace `import OpenAI from "openai"` → `import Groq from "groq-sdk"`
2. Replace `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })` → `new Groq({ apiKey: process.env.GROQ_API_KEY })`
3. Change `MODEL` from `"gpt-4o"` → `"llama-3.1-8b-instant"`
4. **Add structured error handling**:
   - Wrap API call with specific error type detection (rate limit 429, auth 401, network errors)
   - Add exponential backoff retry for 429 errors (read `retry-after` header)
   - Add `GroqAPIError` class for clean error propagation
5. **Add context truncation**: Before sending messages, estimate token count and truncate old OBSERVE messages if total exceeds ~4K tokens (leaving room for response)
6. Export `runAgent` for testing

#### [MODIFY] [systemPrompt.js](file:///d:/cli%20project%20website/code/systemPrompt.js)
- **Optimize prompt length** — compress the system prompt to save tokens on every API call (the current prompt is ~4K chars / ~1K tokens, which eats into the 6K TPM budget)
- Keep the same protocol and rules, just make the wording more concise
- Remove verbose code examples and JSON formatting in the prompt

---

### Environment

#### [MODIFY] [.env](file:///d:/cli%20project%20website/code/.env)
- Replace `OPENAI_API_KEY` → `GROQ_API_KEY`

#### [MODIFY] [.env.example](file:///d:/cli%20project%20website/code/.env.example)
- Replace `OPENAI_API_KEY` → `GROQ_API_KEY`

---

### Error Handling Architecture

```
┌──────────────────────────────────────────────────┐
│                  Error Hierarchy                  │
├──────────────────────────────────────────────────┤
│ AgentError (base)                                │
│  ├─ GroqAPIError (API-level: 401, 429, 500)      │
│  │    └─ retryable: bool, retryAfter: number     │
│  ├─ ToolExecutionError (tool threw at runtime)   │
│  ├─ JSONParseError (LLM returned invalid JSON)   │
│  └─ MaxIterationsError (loop exhausted)          │
└──────────────────────────────────────────────────┘
```

**Key behaviors:**
- **429 Rate Limit** → Auto-retry with backoff (up to 3 retries), log delay to CLI
- **401 Auth Error** → Fail immediately with clear "check your GROQ_API_KEY" message  
- **Tool errors** → Catch at tool level, feed error back to LLM as OBSERVE (already done, will improve messages)
- **JSON parse errors** → Feed correction prompt back to LLM (already done)
- **Network errors** → Classify as retryable, backoff and retry

---

### Testing

#### [NEW] [test.js](file:///d:/cli%20project%20website/code/test.js)

A single, cost-optimized test file that validates the **complete workflow** with minimal token usage:

**Test strategy: 1 integration test, ~3 lightweight unit tests**

1. **Unit: Tool tests (zero API cost)**
   - `parseAndExtract` with a tiny HTML fixture (50 lines) → verify extracted JSON shape
   - `generateCleanHTML` with mock sections → verify HTML output contains key elements
   - `saveFile` → write temp file, verify existence, clean up

2. **Integration: Minimal agent loop (1-3 API calls)**
   - Feed the agent a **trivial task** that completes in minimal steps: `"Say hello"` 
   - This tests: Groq client init → API call → JSON parse → OUTPUT step → loop exit
   - Validates the entire ReAct loop with ~100 tokens total
   - **Does NOT run the full "Clone Scaler" flow** (that would burn thousands of tokens)

**Total estimated cost: ~200 tokens** (well within free tier limits)

---

## Verification Plan

### Automated Tests
```bash
node test.js
```
All tests should pass with ✅. The test file uses `assert` from Node.js stdlib — no test framework dependency needed.

### Manual Verification
- Run `node index.js` and type "Clone Scaler website"  
- Verify `scaler_clone/` directory is created with 3 files
- Open `index.html` in browser
