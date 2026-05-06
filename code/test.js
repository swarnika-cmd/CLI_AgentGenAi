/**
 * Test suite for the Scaler CLI Agent (Groq migration).
 *
 * Strategy: 3 zero-cost unit tests + 1 minimal integration test (~200 tokens).
 * Run: node test.js
 */

import "dotenv/config";
import assert from "assert";
import fs from "fs";
import path from "path";
import { parseAndExtract, generateCleanHTML, saveFile } from "./tools.js";
import { runAgent } from "./index.js";

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ${C.green}✅ ${name}${C.reset}`);
  } catch (err) {
    failed++;
    console.log(`  ${C.red}❌ ${name}${C.reset}`);
    console.log(`     ${C.dim}${err.message}${C.reset}`);
  }
}

// ═══════════════════════════════════════
//  UNIT TESTS (Zero API cost)
// ═══════════════════════════════════════

console.log(`\n${C.cyan}${C.bold}── Unit Tests ──${C.reset}\n`);

// Test 1: parseAndExtract with tiny HTML fixture
await test("parseAndExtract — extracts header, hero, footer from HTML", async () => {
  const html = `
    <html><body>
      <header>
        <a class="logo" href="/">TestBrand</a>
        <nav>
          <a href="/about">About</a>
          <a href="/pricing">Pricing</a>
        </nav>
        <a class="btn" href="/signup">Sign Up</a>
      </header>
      <section class="hero">
        <h1>Build Something Great</h1>
        <p>The best platform for developers.</p>
        <a class="btn-primary" href="/start">Get Started</a>
      </section>
      <footer>
        <div class="col">
          <h4>Company</h4>
          <ul><li><a href="/about">About</a></li><li><a href="/careers">Careers</a></li></ul>
        </div>
        <p class="copy">© 2025 TestBrand</p>
      </footer>
    </body></html>
  `;

  const resultStr = await parseAndExtract({ html });
  const result = JSON.parse(resultStr);

  // Header checks
  assert.ok(result.header, "Missing header");
  assert.ok(result.header.logo, "Missing logo");
  assert.strictEqual(result.header.logo.text, "TestBrand");
  assert.ok(result.header.navLinks.length >= 2, "Expected at least 2 nav links");

  // Hero checks
  assert.ok(result.hero, "Missing hero");
  assert.strictEqual(result.hero.headline, "Build Something Great");
  assert.ok(result.hero.subheadline.includes("best platform"), "Subheadline mismatch");

  // Footer checks
  assert.ok(result.footer, "Missing footer");
  assert.ok(result.footer.copyright.includes("2025"), "Copyright year missing");
});

// Test 2: generateCleanHTML with mock sections
await test("generateCleanHTML — produces valid HTML with sections", async () => {
  const sections = {
    header: {
      logo: { text: "MockBrand", imgUrl: "" },
      navLinks: [{ text: "Home", href: "/" }, { text: "About", href: "/about" }],
      ctaButtons: [{ text: "Join", href: "/join" }],
    },
    hero: {
      headline: "Welcome to MockBrand",
      subheadline: "A test subtitle.",
      ctaButtons: [{ text: "Start Now", href: "/start" }],
      stats: ["100+ Users"],
    },
    footer: {
      columns: [{ heading: "Links", links: [{ text: "Blog", href: "/blog" }] }],
      copyright: "© 2025 MockBrand",
      socialLinks: [],
    },
  };

  const html = await generateCleanHTML({ sections });

  assert.ok(html.includes("<!DOCTYPE html>"), "Missing doctype");
  assert.ok(html.includes("MockBrand"), "Missing brand name");
  assert.ok(html.includes("Welcome to MockBrand"), "Missing headline");
  assert.ok(html.includes("<header"), "Missing header element");
  assert.ok(html.includes("<footer"), "Missing footer element");
  assert.ok(html.includes("Start Now"), "Missing CTA text");
  assert.ok(html.includes("100+ Users"), "Missing stats");
});

// Test 3: saveFile — write, verify, cleanup
await test("saveFile — writes file and confirms", async () => {
  const testDir = path.join(process.cwd(), "_test_tmp");
  const testFile = path.join(testDir, "test_output.txt");
  const content = "Hello from test";

  try {
    const result = await saveFile({ filename: testFile, content });
    assert.ok(result.includes("File saved"), "Missing confirmation");
    assert.ok(fs.existsSync(testFile), "File not created");
    assert.strictEqual(fs.readFileSync(testFile, "utf-8"), content);
  } finally {
    // Cleanup
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
  }
});

// ═══════════════════════════════════════
//  INTEGRATION TEST (Minimal API cost)
// ═══════════════════════════════════════

console.log(`\n${C.cyan}${C.bold}── Integration Test ──${C.reset}\n`);

await test("runAgent — minimal loop completes with 'Say hello'", async () => {
  // This should: START → maybe THINK → OUTPUT in 1-3 API calls (~100-200 tokens)
  const result = await runAgent("Say hello");
  assert.ok(result, "Agent returned empty result");
  assert.ok(typeof result === "string", "Agent result should be a string");
  assert.ok(result.length > 0, "Agent result should not be empty");
  // The agent should NOT have hit max iterations for such a simple task
  assert.ok(!result.includes("maximum iterations"), "Agent hit max iterations on a simple task");
});

// ═══════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════

console.log(`\n${C.bold}──────────────────────────${C.reset}`);
console.log(`  ${C.green}Passed: ${passed}${C.reset}  ${failed ? C.red : C.dim}Failed: ${failed}${C.reset}`);
console.log(`${C.bold}──────────────────────────${C.reset}\n`);

process.exit(failed > 0 ? 1 : 0);
