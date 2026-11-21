/* app.js — hash router + boot */
const appEl = document.getElementById("app");

function navigate(hash) { if (location.hash === hash) render(); else location.hash = hash; }

function updateChrome() {
  const s = Auth.current();
  const status = document.getElementById("auth-status");
  const adminLink = document.getElementById("admin-link");
  if (s) { status.textContent = `${s.username} · ${s.role}${GitHubStore.hasToken() ? " · token set" : ""}`; adminLink.textContent = "Admin"; }
  else { status.textContent = "Not signed in"; adminLink.textContent = "Admin"; }
}

function render() {
  if (!DB.loaded) return;
  const hash = location.hash || "#/";
  const parts = hash.replace(/^#\//, "").split("/");

  updateChrome();

  if (hash === "#/" || parts[0] === "") { appEl.innerHTML = renderMatrix(document.getElementById("search").value); }
  else if (parts[0] === "technique") { appEl.innerHTML = renderTechnique(decodeURIComponent(parts[1] || "")); wireTechnique(decodeURIComponent(parts[1] || "")); }
  else if (parts[0] === "about") { appEl.innerHTML = renderAbout(); }
  else if (parts[0] === "admin") {
    if (parts[1] === "edit") { appEl.innerHTML = renderEditTechnique(decodeURIComponent(parts[2] || "")); wireEditTechnique(decodeURIComponent(parts[2] || "")); }
    else if (parts[1] === "new") { appEl.innerHTML = renderEditTechnique(null); wireEditTechnique(null); }
    else { appEl.innerHTML = renderAdmin(); wireAdminDashboard(); }
  } else { appEl.innerHTML = `<p class="loading">Page not found. <span class="back" data-route="#/">Home</span></p>`; }
  wireRouteLinks();
  window.scrollTo(0, 0);
}

function wireRouteLinks() {
  document.querySelectorAll("[data-route]").forEach(el => { if (el._wired) return; el._wired = true; el.addEventListener("click", e => { e.preventDefault(); navigate(el.dataset.route); }); });
}

document.getElementById("search").addEventListener("input", () => { if ((location.hash || "#/") === "#/") render(); });

window.addEventListener("hashchange", render);

(async function boot() {
  try { await loadDB(); render(); } catch (e) { appEl.innerHTML = `<div class="msg err">Failed to load data: ${esc(e.message)}</div>`; }
})();

function renderAbout() {
  const DETECTION_RULES_BASE = "https://github.com/ajettesla/detection-rules";
  return `<div class="panel"><h1>About AttackDetect</h1><div class="section"><h2>What this is</h2><p>A concept-level detection knowledge base in the shape of the MITRE ATT&CK matrix. For every technique we explain, in plain language: what the attack is, the concept behind it, how it works step by step, <b>where it lacks</b> (the weakness that lets us catch it), real-world examples, and copy-paste detection queries in KQL, Sigma, Splunk, Chronicle and Elastic — plus how to overcome it.</p></div><div class="section"><h2>It is not a copy of MITRE</h2><p>It is an in-detail, simplified retelling focused on detection logic: understand the attack, then detect it. Sigma acts as the portable pivot format so a rule written once can be translated to other SIEMs.</p></div><div class="section"><h2>Integration with detection-rules</h2><p>This knowledge base provides the <b>concept and detection logic</b>. For actual implemented detection rules (22,000+ rules across YARA-L, KQL, Sigma, SPL, EQL, Wazuh), see the <a href="${DETECTION_RULES_BASE}" target="_blank" rel="noopener">detection-rules repository</a>. Each technique page links to the corresponding rules in that repo.</p><p>The <a href="${DETECTION_RULES_BASE}/blob/main/docs/mitre-coverage.json" target="_blank" rel="noopener">MITRE coverage matrix</a> shows which techniques have rules implemented and in which platforms.</p></div><div class="section"><h2>How editing works (honestly)</h2><p>This is a static site with no backend. Admin sign-in + RBAC decide who sees the editor. Actually saving a change requires a GitHub token with write access, which commits the JSON data files back to the repo — GitHub Pages then redeploys. Passwords are stored as PBKDF2 (310k iterations) + unique salt per user + pepper, so the public <code>users.json</code> never contains a usable password.</p><p><b>Change your password:</b> Signed-in users can change their password in the Admin → Change Password tab. Changes require a GitHub token to persist.</p></div></div>`;
}

function esc(s) { return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """).replace(/'/g, "'"); }