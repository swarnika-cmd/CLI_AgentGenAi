import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

// ─── Tool: fetchHTML ───
export async function fetchHTML({ url }) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      timeout: 15000,
    });
    const html = typeof data === "string" ? data : String(data);
    // Truncate to ~120KB so it fits in LLM context
    return html.length > 120000 ? html.slice(0, 120000) : html;
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
}

// ─── Tool: parseAndExtract ───
export async function parseAndExtract({ html }) {
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, noscript, iframe, svg, link[rel=stylesheet]").remove();

  // ── Header ──
  const headerEl = $("header").first().length ? $("header").first() : $("nav").first();
  const logo = {
    text: headerEl.find('a[class*="logo"], a:first-child, [class*="logo"]').first().text().trim() || "Scaler",
    imgUrl: headerEl.find("img").first().attr("src") || "",
  };
  const navLinks = [];
  headerEl.find("a").each((_, el) => {
    const t = $(el).text().trim();
    const h = $(el).attr("href") || "#";
    if (t && t.length < 40 && !navLinks.find((l) => l.text === t)) {
      navLinks.push({ text: t, href: h });
    }
  });
  const ctaButtons = [];
  headerEl.find('button, a[class*="btn"], a[class*="cta"], a[class*="button"]').each((_, el) => {
    const t = $(el).text().trim();
    if (t) ctaButtons.push({ text: t, href: $(el).attr("href") || "#" });
  });

  // ── Hero ──
  let heroEl = $('section[class*="hero"], section[class*="banner"], div[class*="hero"], div[class*="banner"]').first();
  if (!heroEl.length) {
    // Fallback: first section or large div after header
    heroEl = $("header").next("section, div").first();
  }
  if (!heroEl.length) {
    heroEl = $("main > section:first-child, main > div:first-child, body > section:first-child").first();
  }
  const headline =
    heroEl.find("h1").first().text().trim() ||
    heroEl.find("h2").first().text().trim() ||
    $("h1").first().text().trim() ||
    "Welcome to Scaler";
  const subheadline =
    heroEl.find("h1 + p, h2 + p, h1 ~ p, h2 ~ p").first().text().trim() ||
    heroEl.find("p").first().text().trim() ||
    "Accelerate your tech career with industry-leading programs.";
  const heroButtons = [];
  heroEl.find("button, a[class*='btn'], a[class*='cta'], a[class*='button']").each((_, el) => {
    const t = $(el).text().trim();
    if (t && t.length < 50) heroButtons.push({ text: t, href: $(el).attr("href") || "#" });
  });
  const stats = [];
  heroEl.find('[class*="stat"], [class*="counter"], [class*="metric"]').each((_, el) => {
    const t = $(el).text().trim();
    if (t) stats.push(t);
  });

  // ── Footer ──
  const footerEl = $("footer").first();
  const columns = [];
  footerEl.find('div[class*="col"], ul, div > div').each((_, col) => {
    const heading = $(col).find("h3, h4, h5, strong, b").first().text().trim();
    const links = [];
    $(col)
      .find("a")
      .each((_, a) => {
        const t = $(a).text().trim();
        if (t && t.length < 50) links.push({ text: t, href: $(a).attr("href") || "#" });
      });
    if (heading || links.length > 1) {
      columns.push({ heading: heading || "", links });
    }
  });
  const copyright =
    footerEl.find('[class*="copy"], p:last-child').text().trim() || `© ${new Date().getFullYear()} Scaler`;
  const socialLinks = [];
  footerEl.find('a[href*="twitter"], a[href*="linkedin"], a[href*="facebook"], a[href*="youtube"], a[href*="instagram"]').each((_, el) => {
    socialLinks.push({ platform: $(el).text().trim() || $(el).attr("aria-label") || "Social", href: $(el).attr("href") || "#" });
  });

  return JSON.stringify({
    header: { logo, navLinks: navLinks.slice(0, 8), ctaButtons: ctaButtons.slice(0, 2) },
    hero: {
      headline,
      subheadline,
      ctaButtons: heroButtons.slice(0, 3),
      stats: stats.slice(0, 4),
    },
    footer: {
      columns: columns.slice(0, 5),
      copyright,
      socialLinks,
    },
  });
}

// ─── Tool: generateCleanHTML ───
export async function generateCleanHTML({ sections }) {
  const s = typeof sections === "string" ? JSON.parse(sections) : sections;
  const { header, hero, footer } = s;

  const navLinksHTML = (header.navLinks || []).map((l) => `<a href="${l.href}" class="nav-link">${l.text}</a>`).join("\n            ");
  const ctaHTML = (header.ctaButtons || []).map((b) => `<a href="${b.href}" class="btn btn-nav">${b.text}</a>`).join("\n            ");
  const heroCtaHTML = (hero.ctaButtons || []).map((b, i) => `<a href="${b.href}" class="btn ${i === 0 ? "btn-primary" : "btn-secondary"}">${b.text}</a>`).join("\n              ");
  const statsHTML = (hero.stats || []).map((st) => `<div class="stat-item">${st}</div>`).join("\n              ");

  const footerColsHTML = (footer.columns || [])
    .map((col) => {
      const links = (col.links || []).map((l) => `<li><a href="${l.href}">${l.text}</a></li>`).join("\n                ");
      return `
            <div class="footer-column">
              <h4>${col.heading || ""}</h4>
              <ul>${links}</ul>
            </div>`;
    })
    .join("");

  const socialHTML = (footer.socialLinks || []).map((l) => `<a href="${l.href}" class="social-link" target="_blank" rel="noopener">${l.platform}</a>`).join("\n              ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Scaler - Accelerate your tech career with industry-leading programs">
  <title>Scaler — Homepage Reconstruction</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- ═══ HEADER ═══ -->
  <header id="site-header">
    <div class="container header-inner">
      <a href="/" class="logo">${header.logo?.text || "Scaler"}</a>
      <button class="mobile-toggle" id="menuToggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <nav id="mainNav" class="main-nav">
        <div class="nav-links">
            ${navLinksHTML}
        </div>
        <div class="nav-cta">
            ${ctaHTML}
        </div>
      </nav>
    </div>
  </header>

  <!-- ═══ HERO SECTION ═══ -->
  <main>
    <section id="hero" class="hero">
      <div class="container hero-inner">
        <div class="hero-content">
          <h1 class="hero-headline">${hero.headline}</h1>
          <p class="hero-sub">${hero.subheadline}</p>
          <div class="hero-cta">
              ${heroCtaHTML}
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-graphic"></div>
        </div>
      </div>
      ${
        statsHTML
          ? `<div class="container stats-bar">
              ${statsHTML}
            </div>`
          : ""
      }
    </section>
  </main>

  <!-- ═══ FOOTER ═══ -->
  <footer id="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <a href="/" class="logo">${header.logo?.text || "Scaler"}</a>
        <p class="footer-tagline">Accelerating careers in tech</p>
      </div>
      <div class="footer-columns">
        ${footerColsHTML}
      </div>
    </div>
    <div class="footer-bottom container">
      <p>${footer.copyright}</p>
      <div class="social-links">
        ${socialHTML}
      </div>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>`;
}

// ─── Tool: generateCSS ───
export async function generateCSS({ theme = "dark", primaryColor = "#4f46e5", fontFamily = "Inter" } = {}) {
  const isDark = theme === "dark";
  return `/* ═══════════════════════════════════════
   Scaler Reconstruction — Stylesheet
   Generated by CLI AI Agent
   ═══════════════════════════════════════ */

:root {
  --bg-primary: ${isDark ? "#0f0f1a" : "#ffffff"};
  --bg-secondary: ${isDark ? "#1a1a2e" : "#f8f9fa"};
  --bg-card: ${isDark ? "#16213e" : "#ffffff"};
  --text-primary: ${isDark ? "#e8e8f0" : "#1a1a2e"};
  --text-secondary: ${isDark ? "#a0a0b8" : "#6b7280"};
  --accent: ${primaryColor};
  --accent-hover: ${isDark ? "#6366f1" : "#4338ca"};
  --accent-glow: ${primaryColor}33;
  --border: ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"};
  --font: '${fontFamily}', system-ui, -apple-system, sans-serif;
  --radius: 12px;
  --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--font);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
ul { list-style: none; }
img { max-width: 100%; display: block; }

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ═══ HEADER ═══ */
#site-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  background: ${isDark ? "rgba(15,15,26,0.85)" : "rgba(255,255,255,0.85)"};
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  transition: background var(--transition);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
}
.logo {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -0.5px;
}
.main-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nav-links {
  display: flex;
  gap: 4px;
}
.nav-link {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all var(--transition);
}
.nav-link:hover {
  color: var(--text-primary);
  background: var(--accent-glow);
}
.nav-cta { display: flex; gap: 8px; margin-left: 16px; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all var(--transition);
}
.btn-nav {
  background: var(--accent);
  color: #fff;
}
.btn-nav:hover { background: var(--accent-hover); transform: translateY(-1px); }
.btn-primary {
  background: var(--accent);
  color: #fff;
  padding: 14px 32px;
  font-size: 1rem;
  box-shadow: 0 4px 24px var(--accent-glow);
}
.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px var(--accent-glow);
}
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1.5px solid var(--border);
  padding: 14px 32px;
  font-size: 1rem;
}
.btn-secondary:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-glow);
}

/* Mobile Toggle */
.mobile-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}
.mobile-toggle span {
  width: 24px; height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: all var(--transition);
}

/* ═══ HERO ═══ */
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-top: 72px;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  top: -50%; right: -30%;
  width: 80%; height: 150%;
  background: radial-gradient(ellipse, var(--accent-glow) 0%, transparent 70%);
  pointer-events: none;
}
.hero-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  padding: 80px 0;
  position: relative;
  z-index: 1;
}
.hero-headline {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -1px;
  margin-bottom: 20px;
}
.hero-sub {
  font-size: 1.15rem;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 36px;
  max-width: 520px;
}
.hero-cta { display: flex; gap: 16px; flex-wrap: wrap; }

/* Hero Visual / Graphic */
.hero-visual {
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-graphic {
  width: 100%;
  aspect-ratio: 1;
  max-width: 420px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent) 0%, ${isDark ? "#6366f1" : "#818cf8"} 50%, ${isDark ? "#a855f7" : "#c084fc"} 100%);
  opacity: 0.15;
  animation: pulse 4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.15; }
  50% { transform: scale(1.05); opacity: 0.25; }
}

/* Stats Bar */
.stats-bar {
  display: flex;
  justify-content: center;
  gap: 48px;
  padding: 32px 0;
  border-top: 1px solid var(--border);
  position: relative;
  z-index: 1;
}
.stat-item {
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* ═══ FOOTER ═══ */
#site-footer {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  padding-top: 64px;
}
.footer-inner {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 48px;
  padding-bottom: 48px;
}
.footer-brand .logo { margin-bottom: 12px; display: inline-block; }
.footer-tagline {
  font-size: 0.9rem;
  color: var(--text-secondary);
}
.footer-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 32px;
}
.footer-column h4 {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-primary);
  margin-bottom: 16px;
}
.footer-column li { margin-bottom: 10px; }
.footer-column a {
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: color var(--transition);
}
.footer-column a:hover { color: var(--accent); }
.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px;
  border-top: 1px solid var(--border);
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.social-links { display: flex; gap: 16px; }
.social-link {
  color: var(--text-secondary);
  transition: color var(--transition);
}
.social-link:hover { color: var(--accent); }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 1024px) {
  .hero-inner { grid-template-columns: 1fr; text-align: center; }
  .hero-sub { margin: 0 auto 36px; }
  .hero-cta { justify-content: center; }
  .hero-visual { display: none; }
  .footer-inner { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .mobile-toggle { display: flex; }
  .main-nav {
    position: fixed;
    top: 72px; left: 0; right: 0; bottom: 0;
    flex-direction: column;
    background: var(--bg-primary);
    padding: 24px;
    transform: translateX(100%);
    transition: transform var(--transition);
  }
  .main-nav.open { transform: translateX(0); }
  .nav-links { flex-direction: column; }
  .nav-cta { flex-direction: column; margin-left: 0; margin-top: 16px; }
  .stats-bar { flex-wrap: wrap; gap: 24px; }
  .footer-bottom { flex-direction: column; gap: 16px; text-align: center; }
}
`;
}

// ─── Tool: generateJS ───
export async function generateJS({ features = [] } = {}) {
  return `/* ═══════════════════════════════════════
   Scaler Reconstruction — Script
   Generated by CLI AI Agent
   ═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // ── Mobile Menu Toggle ──
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      toggle.classList.toggle('active');
    });
    // Close menu when clicking a link
    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.classList.remove('active');
      });
    });
  }

  // ── Scroll-based header styling ──
  const header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  // ── Fade-in animations on scroll ──
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.hero-content, .footer-column, .stat-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });

  // Add visible class styling
  const style = document.createElement('style');
  style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
  document.head.appendChild(style);

  console.log('🚀 Scaler reconstruction loaded successfully.');
});
`;
}

// ─── Tool: saveFile ───
export async function saveFile({ filename, content }) {
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filename, content, "utf-8");
  return `File saved: ${filename} (${content.length} bytes)`;
}

// ─── Tool: openInBrowser ───
export async function openInBrowser({ filepath }) {
  const abs = path.resolve(filepath);
  if (!fs.existsSync(abs)) return `ERROR: File not found: ${abs}`;
  return new Promise((resolve) => {
    exec(`start "" "${abs}"`, (err) => {
      resolve(err ? `ERROR: ${err.message}` : `Opened in browser: ${abs}`);
    });
  });
}

// ─── Tool Map ───
export const toolMap = {
  fetchHTML,
  parseAndExtract,
  generateCleanHTML,
  generateCSS,
  generateJS,
  saveFile,
  openInBrowser,
};
