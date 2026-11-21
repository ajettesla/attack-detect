/* auth.js — PBKDF2 (salt + pepper) auth + RBAC + session */
const Auth = {
  SESSION_KEY: "attackdetect.session",

  b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
  bytesToB64(bytes) {
    let bin = "";
    const a = new Uint8Array(bytes);
    for (let i = 0; i < a.length; i++) bin += String.fromCharCode(a[i]);
    return btoa(bin);
  },

  async derive(password, saltBytes) {
    const p = DB.usersFile.authParams;
    const material = new TextEncoder().encode(password + p.pepper);
    const key = await crypto.subtle.importKey("raw", material, "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltBytes, iterations: p.iterations, hash: "SHA-256" },
      key,
      p.hashLength * 8
    );
    return this.bytesToB64(new Uint8Array(bits));
  },

  safeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  },

  async login(username, password) {
    const user = DB.usersFile.users.find(u => u.username === username);
    if (!user) {
      await this.derive(password, this.b64ToBytes("AAAAAAAAAAAAAAAAAAAAAA=="));
      return { ok: false, error: "Invalid username or password" };
    }
    const computed = await this.derive(password, this.b64ToBytes(user.salt));
    if (!this.safeEqual(computed, user.hash)) {
      return { ok: false, error: "Invalid username or password" };
    }
    const session = { username: user.username, role: user.role, at: Date.now() };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return { ok: true, session };
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    GitHubStore.clearToken();
  },

  current() {
    try { return JSON.parse(sessionStorage.getItem(this.SESSION_KEY)); } catch { return null; }
  },

  can(permission) {
    const s = this.current();
    if (!s) return false;
    const role = DB.usersFile.roles[s.role];
    return !!(role && role[permission]);
  },

  async makeUserRecord(username, password, role) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await this.derive(password, salt);
    return { username, role, salt: this.bytesToB64(salt), hash, createdAt: new Date().toISOString().slice(0, 10) };
  }
};