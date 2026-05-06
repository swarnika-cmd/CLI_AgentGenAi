import "dotenv/config";
import Groq from "groq-sdk";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { toolMap } from "./tools.js";

// ── Error Hierarchy ──
export class AgentError extends Error {
  constructor(message, opts = {}) {
    super(message);
    this.name = "AgentError";
    Object.assign(this, opts);
  }
}

export class GroqAPIError extends AgentError {
  constructor(message, { status, retryable = false, retryAfter = null } = {}) {
    super(message, { status, retryable, retryAfter });
    this.name = "GroqAPIError";
  }
}

export class ToolExecutionError extends AgentError {
  constructor(toolName, cause) {
    super(`Tool "${toolName}" failed: ${cause.message}`, { toolName });
    this.name = "ToolExecutionError";
    this.cause = cause;
  }
}

export class JSONParseError extends AgentError {
  constructor(rawText) {
    super("LLM returned invalid JSON");
    this.name = "JSONParseError";
    this.rawText = rawText?.slice(0, 500);
  }
}

export class MaxIterationsError extends AgentError {
  constructor(iterations) {
    super(`Agent stopped after ${iterations} iterations`);
    this.name = "MaxIterationsError";
    this.iterations = iterations;
  }
}

// ── Config ──
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-8b-instant";
const MAX_ITERATIONS = 25;
const MAX_RETRIES = 3;
const MAX_CONTEXT_CHARS = 16000; // ~4K tokens — keep well under 6K TPM

// ── Pretty CLI Helpers ──
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

function log(prefix, color, msg) {
  console.log(`${color}${C.bold}[${prefix}]${C.reset} ${msg}`);
}

// ── Groq API Call with Retry ──
async function callGroqWithRetry(messages) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
      return response;
    } catch (err) {
      const status = err?.status || err?.response?.status;

      // 401 — auth error, fail immediately
      if (status === 401) {
        throw new GroqAPIError(
          "Authentication failed. Check your GROQ_API_KEY in .env",
          { status: 401, retryable: false }
        );
      }

      // 429 — rate limit, retry with backoff
      if (status === 429) {
        const retryAfter = parseInt(err?.headers?.["retry-after"] || "0", 10);
        const delay = Math.max(retryAfter * 1000, Math.pow(2, attempt) * 1000);

        if (attempt < MAX_RETRIES) {
          log("RATE-LIMIT", C.yellow, `429 hit — retrying in ${(delay / 1000).toFixed(1)}s (attempt ${attempt}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, delay));
          lastError = err;
          continue;
        }

        throw new GroqAPIError(
          `Rate limit exceeded after ${MAX_RETRIES} retries`,
          { status: 429, retryable: false, retryAfter: delay }
        );
      }

      // 5xx — server error, retry
      if (status >= 500) {
        const delay = Math.pow(2, attempt) * 1000;
        if (attempt < MAX_RETRIES) {
          log("SERVER-ERR", C.yellow, `${status} error — retrying in ${(delay / 1000).toFixed(1)}s`);
          await new Promise((r) => setTimeout(r, delay));
          lastError = err;
          continue;
        }
      }

      // Network / unknown errors — retry
      if (!status) {
        const delay = Math.pow(2, attempt) * 1000;
        if (attempt < MAX_RETRIES) {
          log("NETWORK", C.yellow, `Network error — retrying in ${(delay / 1000).toFixed(1)}s`);
          await new Promise((r) => setTimeout(r, delay));
          lastError = err;
          continue;
        }
      }

      // Anything else — fail
      throw new GroqAPIError(err.message, { status, retryable: false });
    }
  }

  throw new GroqAPIError(
    `API call failed after ${MAX_RETRIES} retries: ${lastError?.message}`,
    { status: lastError?.status, retryable: false }
  );
}

// ── Context Truncation ──
// Estimate ~4 chars per token. Trim oldest OBSERVE messages first to stay under budget.
function truncateContext(messages) {
  let totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);

  if (totalChars <= MAX_CONTEXT_CHARS) return messages;

  // Never trim system (index 0) or user prompt (index 1)
  const trimmed = [...messages];
  for (let i = 2; i < trimmed.length - 2; i++) {
    if (totalChars <= MAX_CONTEXT_CHARS) break;
    const msg = trimmed[i];
    // Only trim OBSERVE messages (user messages containing tool results)
    if (msg.role === "user" && msg.content?.includes('"type":"OBSERVE"')) {
      const removed = msg.content.length;
      trimmed[i] = {
        role: "user",
        content: JSON.stringify({ type: "OBSERVE", content: "[TRIMMED — old result removed to save context]" }),
      };
      totalChars -= removed - trimmed[i].content.length;
    }
  }

  return trimmed;
}

// ── Agent Loop ──
export async function runAgent(userMessage) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    log("LOOP", C.dim, `Iteration ${iteration}/${MAX_ITERATIONS}`);

    // Truncate context before calling API
    const trimmedMessages = truncateContext(messages);

    let response;
    try {
      response = await callGroqWithRetry(trimmedMessages);
    } catch (err) {
      if (err instanceof GroqAPIError) {
        log("ERROR", C.red, `Groq API: ${err.message}`);
      } else {
        log("ERROR", C.red, `Unexpected error: ${err.message}`);
      }
      return `Agent stopped: ${err.message}`;
    }

    const raw = response.choices[0].message.content;
    messages.push({ role: "assistant", content: raw });

    let step;
    try {
      step = JSON.parse(raw);
    } catch {
      log("ERROR", C.red, `Failed to parse JSON: ${raw?.slice(0, 200)}`);
      messages.push({
        role: "user",
        content: JSON.stringify({
          type: "OBSERVE",
          content: "ERROR: Your response was not valid JSON. Please respond with a valid JSON object.",
        }),
      });
      continue;
    }

    // ── Handle each step type ──
    switch (step.type) {
      case "START":
        log("START", C.cyan, step.content);
        break;

      case "THINK":
        log("THINK", C.yellow, step.content);
        break;

      case "TOOL": {
        const toolName = step.tool;
        const toolInput = step.input || {};
        log("TOOL", C.magenta, `Calling ${toolName}(${JSON.stringify(toolInput).slice(0, 120)}...)`);

        const fn = toolMap[toolName];
        if (!fn) {
          const errMsg = `Unknown tool: ${toolName}. Available: ${Object.keys(toolMap).join(", ")}`;
          log("ERROR", C.red, errMsg);
          messages.push({
            role: "user",
            content: JSON.stringify({ type: "OBSERVE", content: errMsg }),
          });
          break;
        }

        try {
          const result = await fn(toolInput);
          const resultStr = typeof result === "string" ? result : JSON.stringify(result);
          // Truncate very large results for the LLM context to avoid hitting 6k TPM limits
          const truncated = resultStr.length > 2000 ? resultStr.slice(0, 2000) + "\n...[TRUNCATED]" : resultStr;
          log("OBSERVE", C.blue, `Result (${resultStr.length} chars): ${resultStr.slice(0, 150)}...`);
          messages.push({
            role: "user",
            content: JSON.stringify({ type: "OBSERVE", content: truncated }),
          });
        } catch (err) {
          const toolErr = new ToolExecutionError(toolName, err);
          log("ERROR", C.red, toolErr.message);
          messages.push({
            role: "user",
            content: JSON.stringify({ type: "OBSERVE", content: `ERROR: ${err.message}` }),
          });
        }
        break;
      }

      case "OUTPUT":
        log("OUTPUT", C.green, step.content);
        console.log(`\n${C.green}${C.bold}═══ Agent Complete ═══${C.reset}\n`);
        return step.content;

      default:
        log("WARN", C.yellow, `Unknown step type: ${step.type}`);
        messages.push({
          role: "user",
          content: JSON.stringify({
            type: "OBSERVE",
            content: `Unknown step type "${step.type}". Use START, THINK, TOOL, or OUTPUT.`,
          }),
        });
    }
  }

  log("WARN", C.red, "Max iterations reached.");
  return "Agent stopped: maximum iterations reached.";
}

// ── CLI REPL ──
async function main() {
  console.log(`
${C.cyan}${C.bold}╔══════════════════════════════════════════════╗
║     🤖  CLI AI Agent — Website Reconstructor  ║
╚══════════════════════════════════════════════╝${C.reset}
${C.dim}Powered by Groq (${MODEL})${C.reset}
${C.dim}Type a command (e.g. "Clone Scaler website") or "exit" to quit.${C.reset}
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${C.green}> ${C.reset}`,
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      console.log(`${C.dim}Goodbye!${C.reset}`);
      rl.close();
      process.exit(0);
    }
    console.log();
    await runAgent(input);
    console.log();
    rl.prompt();
  });
}

// Only start the REPL when this file is run directly, not when imported
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch(console.error);
}
