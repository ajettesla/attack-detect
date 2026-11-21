/* technique.js — renders a technique detail page with multi-language query tabs */
const QUERY_LANGS = [
  { key: "kql", label: "KQL" },
  { key: "sigma", label: "Sigma" },
  { key: "splunk", label: "Splunk" },
  { key: "google", label: "Chronicle" },
  { key: "elastic", label: "Elastic" },
];
const DETECTION_RULES_BASE = "https://github.com/ajettesla/detection-rules";

function esc(s) { return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """).replace(/'/g, "'"); }

function renderTechnique(id) {
  const t = getTechnique(id);
  if (!t) return `<p class="loading">Technique not found. <span class="back" data-route="#/">Back to matrix</span></p>`;
  const tactic = getTactic(t.tacticId);
  const queries = (t.detection && t.detection.queries) || {};

  const langs = QUERY_LANGS.filter(l => queries[l.key]);
  const tabs = langs.map((l, i) => `<div class="tab ${i === 0 ? "active" : ""}" data-lang="${l.key}">${l.label}</div>`).join("");
  const firstLang = langs[0] ? langs[0].key : null;

  const examples = (t.realWorldExamples || []).map(e => `<div class="ex"><span class="actor">${esc(e.actor)}</span> — ${esc(e.story)}</div>`).join("");
  const dataSources = (t.dataSources || []).map(d => `<span>${esc(d)}</span>`).join("");
  const editBtn = Auth.can("canEditContent") ? `<button class="btn secondary" data-route="#/admin/edit/${esc(t.id)}">Edit this technique</button>` : "";
  const detectionRulesLink = `${DETECTION_RULES_BASE}/tree/main#${t.id.toLowerCase()}`;

  return `<div class="detail">
    <span class="back" data-route="#/">← Back to matrix</span>
    <h1>${esc(t.name)}</h1>
    <div class="subid">${esc(t.id)}</div>
    <div class="badges">
      <span class="badge tactic">${esc(tactic ? tactic.name : t.tacticId)}</span>
      ${(t.platforms || []).map(p => `<span class="badge">${esc(p)}</span>`).join("")}
    </div>
    <div class="section"><h2>In one line</h2><p>${esc(t.summary)}</p></div>
    <div class="section"><h2>The concept</h2><p>${esc(t.concept)}</p></div>
    <div class="section"><h2>How it works</h2><p>${esc(t.howItWorks)}</p></div>
    <div class="section lack"><h2>Where it lacks (why we can catch it)</h2><p>${esc(t.whereItLacks)}</p></div>
    ${examples ? `<div class="section examples"><h2>Real-world examples</h2>${examples}</div>` : ""}
    ${dataSources ? `<div class="section"><h2>Data sources you need</h2><div class="ds-list">${dataSources}</div></div>` : ""}
    <div class="section">
      <h2>Detection Logic</h2>
      ${t.detection && t.detection.logic ? `<p class="query-logic">${esc(t.detection.logic)}</p>` : ""}
      <p class="hint">For actual implemented detection rules (YARA-L, KQL, Sigma, SPL, EQL), see the <a href="${detectionRulesLink}" target="_blank" rel="noopener">detection-rules repository</a> which contains 22,000+ rules mapped to MITRE techniques.</p>
      ${firstLang ? `<div class="tabs">${tabs}</div><div class="code-wrap"><button class="copy-btn">Copy</button><pre class="code" id="code-block">${esc(queries[firstLang])}</pre></div>` : `<p class="query-logic">No example queries yet for this technique.</p>`}
    </div>
    <div class="section mit"><h2>How to overcome it</h2><p>${esc(t.mitigation)}</p></div>
    <div class="btn-row">${editBtn}</div>
  </div>`;
}

function wireTechnique(id) {
  const t = getTechnique(id);
  if (!t) return;
  const queries = (t.detection && t.detection.queries) || {};
  const block = document.getElementById("code-block");

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      tab.classList.add("active");
      block.textContent = queries[tab.dataset.lang] || "";
    });
  });

  const copyBtn = document.querySelector(".copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(block.textContent);
        copyBtn.textContent = "Copied ✓";
        setTimeout(() => copyBtn.textContent = "Copy", 1400);
      } catch { copyBtn.textContent = "Copy failed"; }
    });
  }
}