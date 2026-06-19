const AUTH_KEY     = "1waymirror_auth_v1";
const ACCOUNTS_KEY = "1waymirror_accounts_v1";
const HASH_PREFIX  = "$sha256$";

export type AuthUser = {
  name: string;
  email: string;
};

export type Account = {
  email: string;
  name: string;
  password: string;
  registeredAt: number;
  learnerId?: string;
  plan?: "free" | "pro" | "premium";
  cardLast4?: string;
  cardBrand?: string;
};

/* ── Password hashing (SHA-256 via Web Crypto) ──────────────── */
async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, email: string): Promise<string> {
  const hash = await sha256Hex(`${email.toLowerCase().trim()}:${password}`);
  return HASH_PREFIX + hash;
}

function isHashed(pw: string): boolean {
  return pw.startsWith(HASH_PREFIX);
}

/* ── Accounts registry ─────────────────────────────────── */
function getAccounts(): Account[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as Account[]; }
  catch { return []; }
}

function saveAccounts(accounts: Account[]): void {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch { /* noop */ }
}

export function getAllAccounts(): Account[] {
  return getAccounts();
}

export function emailExists(email: string): boolean {
  return getAccounts().some(a => a.email.toLowerCase() === email.toLowerCase());
}

export async function registerAccount(
  name: string, email: string, password: string, learnerId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const norm = email.trim().toLowerCase();
  if (emailExists(norm)) {
    return { ok: false, error: "An account with this email already exists. Please sign in instead." };
  }
  const hashed = await hashPassword(password, norm);
  const accounts = getAccounts();
  accounts.push({ email: norm, name: name.trim(), password: hashed, registeredAt: Date.now(), learnerId, plan: "free" });
  saveAccounts(accounts);
  return { ok: true };
}

export async function verifyAccount(email: string, password: string): Promise<Account | null> {
  const norm = email.trim().toLowerCase();
  const account = getAccounts().find(a => a.email === norm);
  if (!account) return null;

  if (isHashed(account.password)) {
    const hashed = await hashPassword(password, norm);
    return hashed === account.password ? account : null;
  } else {
    /* Legacy plaintext — migrate to hash on successful login */
    if (account.password === password) {
      const hashed = await hashPassword(password, norm);
      updateAccount(norm, { password: hashed });
      return account;
    }
    return null;
  }
}

export function updateAccount(email: string, updates: Partial<Account>): void {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.email === email.trim().toLowerCase());
  if (idx !== -1) { accounts[idx] = { ...accounts[idx], ...updates }; saveAccounts(accounts); }
}

export function deleteAccount(email: string): void {
  const accounts = getAccounts().filter(a => a.email !== email.trim().toLowerCase());
  saveAccounts(accounts);
}

/* ── Active session ─────────────────────────────────────── */
export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch { return null; }
}

export function signIn(name: string, email: string): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ name, email }));
}

export function signOut(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAuthUser();
}
