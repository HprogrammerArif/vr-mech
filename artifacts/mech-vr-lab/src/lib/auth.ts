const AUTH_KEY = "1waymirror_auth_v1";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  plan: "free" | "starter" | "explorer" | "builder" | "accelerator";
};

/* ── Active session ─────────────────────────────────────── */
export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function signIn(user: AuthUser): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function signOut(): void {
  localStorage.removeItem(AUTH_KEY);
  // Call backend logout endpoint to clear HttpOnly cookie
  fetch("/api/auth/logout", { method: "POST" }).catch(() => { });
}

export function isLoggedIn(): boolean {
  return !!getAuthUser();
}

/* ── Backend Auth API Integrations ─────────────────────── */

export async function registerAccount(userData: {
  name: string;
  email: string;
  password: string;
  birthdate?: string;
  grade: number;
  graduationYear?: number;
  schoolName: string;
  schoolEmail?: string;
  careerInterests: string[];
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  noParentContact?: boolean;
  counselorEmail?: string;
}): Promise<{ ok: boolean; error?: string; user?: AuthUser }> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Registration failed." };
    }
    return { ok: true, user: data };
  } catch (err) {
    return { ok: false, error: "Unable to connect to the authentication server." };
  }
}

export async function verifyAccount(email: string, password: string): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data as AuthUser;
  } catch (err) {
    return null;
  }
}

// Fetch active session from cookie
export async function fetchCurrentSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return null;
    const data = await res.json();
    signIn(data);
    return data as AuthUser;
  } catch (err) {
    return null;
  }
}

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

const ACCOUNTS_KEY = "1waymirror_accounts_v1";

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

export function deleteAccount(email: string): void {
  const accounts = getAccounts().filter(a => a.email.toLowerCase() !== email.toLowerCase().trim());
  saveAccounts(accounts);
}

export function updateAccount(email: string, updates: Partial<Account>): void {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.email.toLowerCase() === email.toLowerCase().trim());
  if (idx !== -1) {
    accounts[idx] = { ...accounts[idx], ...updates };
    saveAccounts(accounts);
  }
}
