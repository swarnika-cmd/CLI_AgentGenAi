/**
 * Generates the full Scaler clone HTML page.
 * Extracted into its own module for maintainability.
 */
export function buildScalerHTML(data) {
  const d = typeof data === "string" ? JSON.parse(data) : data;

  // Use extracted data with sensible Scaler defaults
  const headline = d?.hero?.headline || "Become the Professional Built for the Next Decade in AI.";
  const subheadline = d?.hero?.subheadline || "The investment that compounds. Strong technical foundations, AI integrated at every stage, and a curriculum that evolves as the market does.";

  const navLinks = d?.header?.navLinks?.length
    ? d.header.navLinks
    : [
        { text: "Why Scaler", href: "#whyscaler" },
        { text: "Programs", href: "#programs" },
        { text: "Stories", href: "#stories" },
        { text: "Podcast", href: "#podcast" },
        { text: "Placement Report", href: "#stats" },
      ];

  const programs = [
    {
      title: "Modern Software &amp; AI Engineering",
      ratings: "25K+ Ratings",
      desc: "Strong engineering fundamentals — DSA, system design, and backend architecture. AI woven into every lab, assignment, and DSA problem with a 24×7 AI Companion.",
      link: "https://www.scaler.com/academy/",
      icon: "💻",
    },
    {
      title: "Modern Data Science and ML with Specialisation in AI",
      ratings: "15K+ Ratings",
      desc: "Data science and ML fundamentals — SQL, Python, statistics, machine learning, and MLOps taught as a connected system from raw data to deployed model.",
      link: "https://www.scaler.com/data-science-course/",
      icon: "📊",
    },
    {
      title: "Advanced AIML with Agentic AI",
      ratings: "4K+ Ratings",
      desc: "ML fundamentals to full AI engineering — deep learning, NLP, computer vision, RAG pipelines, fine-tuning, and production deployment.",
      link: "https://www.scaler.com/ai-machine-learning-course/",
      icon: "🤖",
    },
    {
      title: "DevOps, Cloud &amp; AI Platform Engineering",
      ratings: "8K+ Ratings",
      desc: "Linux to Kubernetes, CI/CD, Terraform, and AWS taught as one system. AI-native operations across workflows.",
      link: "https://www.scaler.com/devops-course/",
      icon: "☁️",
    },
  ];

  const whyScaler = [
    {
      title: "AI-Integrated Curriculum",
      desc: "Every phase is structured around how the best technical teams work today — with AI embedded in how problems are framed, built, and shipped. Updated quarterly.",
      icon: "🎯",
    },
    {
      title: "AI Powered Platform",
      desc: "AI-assisted coding woven into every lab, assignment, and DSA problem with a 24×7 AI Companion that hints, critiques, and pair-programs alongside you.",
      icon: "⚡",
    },
    {
      title: "Lifelong Learning Access",
      desc: "The curriculum moves as the market does. When the industry shifts, your knowledge shifts with it — at no extra cost. Built to last.",
      icon: "♾️",
    },
    {
      title: "Strong Foundations",
      desc: "DSA. System design. Engineering judgment. AI makes those fundamentals hit harder, not the other way around. Depth that doesn't expire.",
      icon: "🏗️",
    },
  ];

  const stats = [
    { value: "93%", label: "Career transition rate for 2024 Academy cohort" },
    { value: "18 LPA", label: "Overall median CTC post-Scaler" },
    { value: "126%", label: "Median hike in CTC for program completers" },
    { value: "₹28 LPA", label: "Median CTC for top 25% of assessed cohort" },
  ];

  const footerCols = [
    {
      heading: "Explore Scaler",
      links: [
        { text: "Software & AI Engineering", href: "https://www.scaler.com/academy/" },
        { text: "Data Science & ML", href: "https://www.scaler.com/data-science-course/" },
        { text: "DevOps & Cloud", href: "https://www.scaler.com/devops-course/" },
        { text: "Advanced AIML", href: "https://www.scaler.com/ai-machine-learning-course/" },
      ],
    },
    {
      heading: "Resources",
      links: [
        { text: "Alumni Reviews", href: "https://www.scaler.com/review/" },
        { text: "Blogs", href: "https://www.scaler.com/blog/" },
        { text: "Contact Us", href: "https://www.scaler.com/contact/" },
        { text: "Careers", href: "https://www.scaler.com/careers/" },
      ],
    },
    {
      heading: "Others",
      links: [
        { text: "About Us", href: "https://www.scaler.com/about" },
        { text: "Become a Mentor", href: "https://www.scaler.com/mentor" },
        { text: "Hire From Us", href: "https://www.scaler.com/enterprise" },
        { text: "Terms of Use", href: "https://www.scaler.com/terms" },
        { text: "Privacy Policy", href: "https://www.scaler.com/privacy" },
      ],
    },
    {
      heading: "Socials",
      links: [
        { text: "YouTube", href: "https://www.youtube.com/@SCALER" },
        { text: "LinkedIn", href: "https://www.linkedin.com/school/scalerofficial" },
        { text: "Twitter", href: "https://twitter.com/scaler_official" },
        { text: "Instagram", href: "https://www.instagram.com/scaler_official/" },
      ],
    },
  ];

  // Build nav HTML
  const navHTML = navLinks.map(l => `<a href="${l.href}" class="nav-link">${l.text}</a>`).join("\n            ");

  // Build program cards
  const programsHTML = programs.map(p => `
          <div class="program-card">
            <div class="program-icon">${p.icon}</div>
            <h3>${p.title}</h3>
            <span class="program-rating">⭐ ${p.ratings}</span>
            <p>${p.desc}</p>
            <a href="${p.link}" class="btn btn-outline" target="_blank">Go To Program →</a>
          </div>`).join("");

  // Build why-scaler cards
  const whyHTML = whyScaler.map(w => `
          <div class="why-card">
            <div class="why-icon">${w.icon}</div>
            <h3>${w.title}</h3>
            <p>${w.desc}</p>
          </div>`).join("");

  // Build stats
  const statsHTML = stats.map(s => `
          <div class="stat-card">
            <div class="stat-value">${s.value}</div>
            <div class="stat-label">${s.label}</div>
          </div>`).join("");

  // Build footer columns
  const footerHTML = footerCols.map(col => {
    const links = col.links.map(l => `<li><a href="${l.href}" target="_blank">${l.text}</a></li>`).join("\n                ");
    return `
            <div class="footer-column">
              <h4>${col.heading}</h4>
              <ul>
                ${links}
              </ul>
            </div>`;
  }).join("");

  // Company logos bar (text-only for simplicity)
  const companies = ["Google", "Microsoft", "Amazon", "Adobe", "Flipkart", "Goldman Sachs", "Uber", "Atlassian"];
  const companyHTML = companies.map(c => `<span class="company-logo">${c}</span>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Scaler - Accelerate your tech career with industry-leading AI programs">
  <title>Scaler — Become the Professional Built for the Next Decade in AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- ═══ HEADER ═══ -->
  <header id="site-header">
    <div class="container header-inner">
      <a href="/" class="logo">
        <span class="logo-icon">S</span>
        <span class="logo-text">scaler</span>
      </a>
      <button class="mobile-toggle" id="menuToggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <nav id="mainNav" class="main-nav">
        <div class="nav-links">
            ${navHTML}
        </div>
        <div class="nav-cta">
            <a href="#" class="btn btn-ghost">Log In</a>
            <a href="#" class="btn btn-primary-sm">Book Free Live Class</a>
        </div>
      </nav>
    </div>
  </header>

  <main>
    <!-- ═══ HERO SECTION ═══ -->
    <section id="hero" class="hero">
      <div class="hero-bg-effects">
        <div class="hero-glow hero-glow-1"></div>
        <div class="hero-glow hero-glow-2"></div>
        <div class="hero-grid-overlay"></div>
      </div>
      <div class="container hero-inner">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="badge-dot"></span>
            AI-First Learning Platform
          </div>
          <h1 class="hero-headline">${headline}</h1>
          <p class="hero-sub">${subheadline}</p>
          <div class="hero-cta">
            <a href="#" class="btn btn-primary">Request A Callback</a>
            <a href="#" class="btn btn-secondary">Book Free Live Class</a>
          </div>
          <div class="hero-trust">
            <div class="trust-avatars">
              <div class="avatar" style="background:#4f46e5">S</div>
              <div class="avatar" style="background:#7c3aed">A</div>
              <div class="avatar" style="background:#2563eb">R</div>
              <div class="avatar" style="background:#0891b2">M</div>
            </div>
            <span>Join <strong>1,00,000+</strong> Scaler alumni</span>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-card-stack">
            <div class="floating-card fc-1">
              <span class="fc-icon">🎓</span>
              <span>25K+ Ratings</span>
            </div>
            <div class="floating-card fc-2">
              <span class="fc-icon">💼</span>
              <span>93% Placed</span>
            </div>
            <div class="floating-card fc-3">
              <span class="fc-icon">📈</span>
              <span>126% Avg Hike</span>
            </div>
            <div class="hero-graphic"></div>
          </div>
        </div>
      </div>
      <div class="container company-bar">
        <p class="company-label">AI-first curriculum built by 100+ engineers from</p>
        <div class="company-logos">
          ${companyHTML}
        </div>
      </div>
    </section>

    <!-- ═══ WHY SCALER ═══ -->
    <section id="whyscaler" class="section why-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Why Scaler</span>
          <h2>Four things no other program gives you</h2>
        </div>
        <div class="why-grid">
          ${whyHTML}
        </div>
      </div>
    </section>

    <!-- ═══ PROGRAMS ═══ -->
    <section id="programs" class="section programs-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Programs</span>
          <h2>Choose Your Path to AI-Era Career Growth</h2>
          <p class="section-sub">Instructors, mentors, and leaders from industry who shape what you learn and how you grow.</p>
        </div>
        <div class="programs-grid">
          ${programsHTML}
        </div>
      </div>
    </section>

    <!-- ═══ STATS ═══ -->
    <section id="stats" class="section stats-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Shaping Careers Since 2019</span>
          <h2>In the AI era, proof matters more than empty promises</h2>
        </div>
        <div class="stats-grid">
          ${statsHTML}
        </div>
        <p class="stats-note">Based on the 2024 Scaler career transition assessment</p>
        <div class="stats-cta">
          <a href="#" class="btn btn-primary">Download Placement Report</a>
        </div>
      </div>
    </section>
  </main>

  <!-- ═══ FOOTER ═══ -->
  <footer id="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <a href="/" class="logo">
          <span class="logo-icon">S</span>
          <span class="logo-text">scaler</span>
        </a>
        <p class="footer-tagline">Accelerating careers in tech since 2019</p>
        <div class="footer-contact">
          <a href="tel:08047939623" class="footer-phone">📞 080-4793-9623</a>
        </div>
      </div>
      <div class="footer-columns">
        ${footerHTML}
      </div>
    </div>
    <div class="footer-bottom container">
      <p>© 2026 InterviewBit Software Services Pvt. Ltd. All Rights Reserved.</p>
      <div class="footer-bottom-links">
        <a href="https://www.scaler.com/terms">Terms of Use</a>
        <a href="https://www.scaler.com/privacy">Privacy Policy</a>
      </div>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>`;
}
