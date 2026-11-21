/* admin.js — login, GitHub token, content editor, user management (RBAC), change password */
var Admin = { tab: "content", flash: null };

function flash(kind, text) { Admin.flash = { kind, text }; }
function renderFlash() { if (!Admin.flash) return ""; const f = Admin.flash; Admin.flash = null; return `<div class="msg ${f.kind}">${esc(f.text)}</div>`; }
function esc(s) { return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """).replace(/'/g, "'"); }

function renderLogin() {
  return `<div class="panel"><h1>Admin sign in</h1>${renderFlash()}<form id="login-form"><div class="field"><label>Username</label><input id="login-user" autocomplete="username" required /></div><div class="field"><label>Password</label><input id="login-pass" type="password" autocomplete="current-password" required /></div><div class="btn-row"><button class="btn" type="submit">Sign in</button></div></form></div>`;
}
function wireLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const u = document.getElementById("login-user").value;
    const p = document.getElementById("login-pass").value;
    const res = await Auth.login(u, p);
    if (res.ok) flash("ok", `Signed in as ${res.session.username} (${res.session.role})`);
    else flash("err", res.error);
    navigate("#/admin");
  });
}

function renderAdmin() {
  const s = Auth.current();
  if (!s) return renderLogin();

  const tabs = [{ k: "content", l: "Content" }];
  if (Auth.can("canManageUsers")) tabs.push({ k: "users", l: "Users" });
  tabs.push({ k: "token", l: "GitHub Token" }, { k: "changepass", l: "Change Password" });

  const tabBar = tabs.map(t => `<div class="admin-tab ${Admin.tab === t.k ? "active" : ""}" data-atab="${t.k}">${t.l}</div>`).join("");
  let body = "";
  if (Admin.tab === "content") body = renderContentTab();
  else if (Admin.tab === "users") body = Auth.can("canManageUsers") ? renderUsersTab() : "";
  else if (Admin.tab === "token") body = renderTokenTab();
  else if (Admin.tab === "changepass") body = renderChangePassTab();

  return `<div class="panel admin-panel"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h1>Admin — ${esc(s.username)} <span class="pill ${esc(s.role)}">${esc(s.role)}</span></h1><button class="btn secondary" id="logout-btn">Sign out</button></div>${renderFlash()}${GitHubStore.hasToken() ? "" : '<div class="msg info">No GitHub token set — you can edit in the UI but cannot save. Add one in the GitHub Token tab.</div>'}<div class="admin-tabs">${tabBar}</div>${body}</div>`;
}

function renderContentTab() {
  if (!Auth.can("canEditContent")) return '<div class="msg err">Your role cannot edit content.</div>';
  const rows = DB.techniques.map(t => {
    const tactic = getTactic(t.tacticId);
    return `<tr><td><b>${esc(t.name)}</b><br><span class="hint">${esc(t.id)}</span></td><td>${esc(tactic ? tactic.name : t.tacticId)}</td><td><button class="btn secondary" data-route="#/admin/edit/${esc(t.id)}">Edit</button></td></tr>`;
  }).join("");
  return `<div class="btn-row"><button class="btn" data-route="#/admin/new">+ Add new technique / attack</button></div><table class="table"><thead><tr><th>Technique</th><th>Tactic</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderEditTechnique(id) {
  if (!Auth.can("canEditContent")) return '<div class="msg err">Your role cannot edit content.</div>';
  const isNew = !id;
  const t = isNew ? blankTechnique() : getTechnique(id);
  if (!t) return `<div class="msg err">Technique ${esc(id)} not found.</div>`;
  const q = (t.detection && t.detection.queries) || {};
  const tacticOpts = DB.tactics.map(ta => `<option value="${esc(ta.id)}" ${ta.id === t.tacticId ? "selected" : ""}>${esc(ta.name)}</option>`).join("");

  return `<div class="panel"><span class="back" data-route="#/admin">← Back to admin</span><h1>${isNew ? "Add new technique / attack" : "Edit: " + esc(t.name)}</h1>${renderFlash()}<form id="tech-form"><div class="grid2"><div class="field"><label>Technique ID (e.g. T1059.001)</label><input id="f-id" value="${esc(t.id)}" ${isNew ? "" : "readonly"} required /></div><div class="field"><label>Tactic</label><select id="f-tactic">${tacticOpts}</select></div></div><div class="field"><label>Name</label><input id="f-name" value="${esc(t.name)}" required /></div><div class="field"><label>Platforms (comma separated)</label><input id="f-platforms" value="${esc((t.platforms || []).join(", "))}" /></div><div class="field"><label>In one line (summary)</label><textarea id="f-summary">${esc(t.summary)}</textarea></div><div class="field"><label>The concept</label><textarea id="f-concept">${esc(t.concept)}</textarea></div><div class="field"><label>How it works</label><textarea id="f-how">${esc(t.howItWorks)}</textarea></div><div class="field"><label>Where it lacks</label><textarea id="f-lack">${esc(t.whereItLacks)}</textarea></div><div class="field"><label>Data sources (comma separated)</label><input id="f-ds" value="${esc((t.dataSources || []).join(", "))}" /></div><div class="field"><label>Real-world examples (one per line, format: Actor :: story)</label><textarea id="f-examples">${esc((t.realWorldExamples || []).map(e => `${e.actor} :: ${e.story}`).join("\n"))}</textarea></div><div class="field"><label>Detection logic (the shared idea)</label><textarea id="f-logic">${esc(t.detection ? t.detection.logic : "")}</textarea></div><div class="field"><label>KQL</label><textarea id="f-kql">${esc(q.kql)}</textarea></div><div class="field"><label>Sigma</label><textarea id="f-sigma">${esc(q.sigma)}</textarea></div><div class="field"><label>Splunk</label><textarea id="f-splunk">${esc(q.splunk)}</textarea></div><div class="field"><label>Chronicle (YARA-L)</label><textarea id="f-google">${esc(q.google)}</textarea></div><div class="field"><label>Elastic (EQL)</label><textarea id="f-elastic">${esc(q.elastic)}</textarea></div><div class="field"><label>How to overcome it (mitigation)</label><textarea id="f-mit">${esc(t.mitigation)}</textarea></div><div class="btn-row"><button class="btn" type="submit">${GitHubStore.hasToken() ? "Save & commit to GitHub" : "Save (needs token)"}</button>${isNew ? "" : `<button class="btn danger" type="button" id="del-btn">Delete</button>`}<button class="btn secondary" type="button" data-route="#/admin">Cancel</button></div></form></div>`;
}

function blankTechnique() { return { id: "", name: "", tacticId: DB.tactics[0] ? DB.tactics[0].id : "", platforms: [], summary: "", concept: "", howItWorks: "", whereItLacks: "", dataSources: [], realWorldExamples: [], mitigation: "", detection: { logic: "", queries: { kql: "", sigma: "", splunk: "", google: "", elastic: "" } } }; }

function collectTechniqueForm(isNew) {
  const val = id => document.getElementById(id).value;
  const list = id => val(id).split(",").map(s => s.trim()).filter(Boolean);
  const examples = val("f-examples").split("\n").map(l => l.trim()).filter(Boolean).map(l => { const [actor, ...rest] = l.split("::"); return { actor: (actor || "").trim(), story: rest.join("::").trim() }; });
  return { id: val("f-id").trim(), name: val("f-name").trim(), tacticId: val("f-tactic"), platforms: list("f-platforms"), summary: val("f-summary").trim(), concept: val("f-concept").trim(), howItWorks: val("f-how").trim(), whereItLacks: val("f-lack").trim(), dataSources: list("f-ds"), realWorldExamples: examples, mitigation: val("f-mit").trim(), detection: { logic: val("f-logic").trim(), queries: { kql: val("f-kql"), sigma: val("f-sigma"), splunk: val("f-splunk"), google: val("f-google"), elastic: val("f-elastic") } } };
}

function wireEditTechnique(id) {
  const form = document.getElementById("tech-form");
  if (!form) return;
  const isNew = !id;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const rec = collectTechniqueForm(isNew);
    if (!rec.id || !rec.name) { flash("err", "ID and Name are required."); return navigate("#/admin/edit/" + (id || "")); }
    const idx = DB.techniques.findIndex(x => x.id === rec.id);
    if (isNew && idx !== -1) { flash("err", `Technique ${rec.id} already exists.`); return navigate("#/admin/new"); }
    if (idx === -1) DB.techniques.push(rec); else DB.techniques[idx] = rec;
    if (!GitHubStore.hasToken()) { flash("info", "Saved in this session only — no GitHub token."); return navigate("#/admin"); }
    try { await GitHubStore.saveJson("data/techniques.json", DB.techniques, `Update technique ${rec.id}`); flash("ok", `Committed ${rec.id} to GitHub. Live in ~1 min.`); } catch (err) { flash("err", err.message); }
    navigate("#/admin");
  });
  const del = document.getElementById("del-btn");
  if (del) del.addEventListener("click", async () => { if (!confirm(`Delete ${id}?`)) return; DB.techniques = DB.techniques.filter(x => x.id !== id); if (!GitHubStore.hasToken()) { flash("info", "Removed in session only (no token)."); return navigate("#/admin"); } try { await GitHubStore.saveJson("data/techniques.json", DB.techniques, `Delete technique ${id}`); flash("ok", `Deleted ${id} and committed.`); } catch (err) { flash("err", err.message); } navigate("#/admin"); });
}

function renderUsersTab() {
  const rows = DB.usersFile.users.map(u => `<tr><td><b>${esc(u.username)}</b></td><td><span class="pill ${esc(u.role)}">${esc(u.role)}</span></td><td>${esc(u.createdAt || "")}</td><td>${u.username === "admin" ? "" : `<button class="btn danger" data-deluser="${esc(u.username)}">Remove</button>`}</td></tr>`).join("");
  const roleOpts = Object.keys(DB.usersFile.roles).map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join("");
  return `<h2 style="color:var(--accent2)">Add user</h2><form id="user-form"><div class="grid2"><div class="field"><label>Username</label><input id="u-name" required /></div><div class="field"><label>Role</label><select id="u-role">${roleOpts}</select></div></div><div class="field"><label>Password</label><input id="u-pass" type="password" required /><div class="hint">Hashed with PBKDF2 (${esc(String(DB.usersFile.authParams.iterations))} iters) + salt + pepper. Plaintext never leaves the browser.</div></div><div class="btn-row"><button class="btn" type="submit">Create user</button></div></form><table class="table"><thead><tr><th>User</th><th>Role</th><th>Created</th><th></th></tr></thead><tbody>${rows}</tbody></table><p class="hint">Roles: <b>admin</b> = edit content + manage users · <b>editor</b> = edit content · <b>viewer</b> = read only.</p>`;
}

function wireUsersTab() {
  const form = document.getElementById("user-form");
  if (form) form.addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("u-name").value.trim();
    const role = document.getElementById("u-role").value;
    const pass = document.getElementById("u-pass").value;
    if (DB.usersFile.users.some(u => u.username === name)) { flash("err", "That username already exists."); return navigate("#/admin"); }
    const rec = await Auth.makeUserRecord(name, pass, role);
    DB.usersFile.users.push(rec);
    if (!GitHubStore.hasToken()) { flash("info", `User ${name} added in session only (no token).`); return navigate("#/admin"); }
    try { await GitHubStore.saveJson("data/users.json", DB.usersFile, `Add user ${name} (${role})`); flash("ok", `User ${name} created and committed.`); } catch (err) { flash("err", err.message); }
    navigate("#/admin");
  });
  document.querySelectorAll("[data-deluser]").forEach(btn => btn.addEventListener("click", async () => {
    const name = btn.dataset.deluser;
    if (!confirm(`Remove user ${name}?`)) return;
    DB.usersFile.users = DB.usersFile.users.filter(u => u.username !== name);
    if (!GitHubStore.hasToken()) { flash("info", `Removed ${name} in session only.`); return navigate("#/admin"); }
    try { await GitHubStore.saveJson("data/users.json", DB.usersFile, `Remove user ${name}`); flash("ok", `User ${name} removed and committed.`); } catch (err) { flash("err", err.message); }
    navigate("#/admin");
  }));
}

function renderTokenTab() {
  const has = GitHubStore.hasToken();
  return `<h2 style="color:var(--accent2)">GitHub write token</h2><div class="msg info">Saving any change commits to <code>${esc(GitHubStore.owner)}/${esc(GitHubStore.repo)}</code>. That requires a <b>fine-grained Personal Access Token</b> with <b>Contents: Read & Write</b> on this repo. The token is held only in this browser tab (sessionStorage) and is cleared on sign out — it is never committed.</div><div class="field"><label>Token</label><input id="gh-token" type="password" placeholder="${has ? "•••••••• (a token is set)" : "github_pat_..."}" /></div><div class="btn-row"><button class="btn" id="save-token">Save token</button><button class="btn secondary" id="verify-token">Verify access</button>${has ? '<button class="btn danger" id="clear-token">Clear token</button>' : ""}</div><div id="token-result"></div>`;
}
function wireTokenTab() {
  const save = document.getElementById("save-token");
  if (save) save.addEventListener("click", () => { const v = document.getElementById("gh-token").value.trim(); if (!v) { flash("err", "Paste a token first."); return navigate("#/admin"); } GitHubStore.setToken(v); flash("ok", "Token saved for this session."); navigate("#/admin"); });
  const verify = document.getElementById("verify-token");
  if (verify) verify.addEventListener("click", async () => { const box = document.getElementById("token-result"); const inp = document.getElementById("gh-token").value.trim(); if (inp) GitHubStore.setToken(inp); box.innerHTML = '<div class="msg info">Checking…</div>'; const res = await GitHubStore.verifyToken(); box.innerHTML = res.ok ? `<div class="msg ok">✓ Write access confirmed to ${esc(res.user)}.</div>` : `<div class="msg err">✗ ${esc(res.error)}</div>`; });
  const clear = document.getElementById("clear-token");
  if (clear) clear.addEventListener("click", () => { GitHubStore.clearToken(); flash("info", "Token cleared."); navigate("#/admin"); });
}

function renderChangePassTab() {
  const data = DB.usersFile;
  return `<div class="panel"><h2 style="color:var(--accent2)">Change your password</h2><div class="msg info">Your password is hashed with PBKDF2-HMAC-SHA256 (${esc(String(data.authParams.iterations))} iterations) + unique 16-byte salt + pepper. The pepper is in <code>users.json</code> but the real write-protection is your GitHub token — without it, password changes cannot be persisted.</div><form id="changepass-form"><div class="field"><label>Current password</label><input id="cp-old" type="password" autocomplete="current-password" required /></div><div class="field"><label>New password</label><input id="cp-new" type="password" autocomplete="new-password" required minlength="12" /><div class="hint">Minimum 12 characters. Use a passphrase or password manager.</div></div><div class="field"><label>Confirm new password</label><input id="cp-confirm" type="password" autocomplete="new-password" required /></div><div class="btn-row"><button class="btn" type="submit" id="cp-save">Save & commit</button><button class="btn secondary" type="button" data-route="#/admin">Cancel</button></div><div id="changepass-result"></div></form></div>`;
}
function wireChangePassTab() {
  const form = document.getElementById("changepass-form");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const oldPass = document.getElementById("cp-old").value;
    const newPass = document.getElementById("cp-new").value;
    const confirmPass = document.getElementId("cp-confirm").value;
    const box = document.getElementById("changepass-result");
    if (newPass !== confirmPass) { box.innerHTML = '<div class="msg err">Passwords do not match.</div>'; return; }
    if (newPass.length < 12) { box.innerHTML = '<div class="msg err">Password must be at least 12 characters.</div>'; return; }
    const session = Auth.current();
    const user = DB.usersFile.users.find(u => u.username === session.username);
    if (!user) { box.innerHTML = '<div class="msg err">User not found.</div>'; return; }
    const saltBytes = Auth.b64ToBytes(user.salt);
    const computed = await Auth.derive(oldPass, saltBytes);
    if (!Auth.safeEqual(computed, user.hash)) { box.innerHTML = '<div class="msg err">Current password is incorrect.</div>'; return; }
    const newSalt = crypto.getRandomValues(new Uint8Array(16));
    const newHash = await Auth.derive(newPass, newSalt);
    user.salt = Auth.bytesToB64(newSalt);
    user.hash = newHash;
    user.updatedAt = new Date().toISOString().slice(0, 10);
    if (!GitHubStore.hasToken()) { box.innerHTML = '<div class="msg info">Password changed in this session only — no GitHub token.</div>'; return; }
    try { await GitHubStore.saveJson("data/users.json", DB.usersFile, `Update password for ${session.username}`); box.innerHTML = '<div class="msg ok">✓ Password changed and committed. You will need to sign in again.</div>'; setTimeout(() => { Auth.logout(); navigate("#/admin"); }, 2000); } catch (err) { box.innerHTML = `<div class="msg err">✗ ${esc(err.message)}</div>`; }
  });
}

function wireAdminDashboard() {
  wireLogin();
  const logout = document.getElementById("logout-btn");
  if (logout) logout.addEventListener("click", () => { Auth.logout(); flash("info", "Signed out."); navigate("#/admin"); });
  document.querySelectorAll("[data-atab]").forEach(tab => tab.addEventListener("click", () => { Admin.tab = tab.dataset.atab; render(); }));
  if (Admin.tab === "content") wireEditTechnique(null);
  if (Admin.tab === "users") wireUsersTab();
  if (Admin.tab === "token") wireTokenTab();
  if (Admin.tab === "changepass") wireChangePassTab();
}