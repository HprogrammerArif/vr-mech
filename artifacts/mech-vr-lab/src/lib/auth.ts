/* ─────────────────────────────────────────────────────────
   Frontend Auth Library
   ─────────────────────────────────────────────────────────
   Strategy:
   - accessToken (15 min) → stored in JS memory (this module)
   - refresh_token (7d)   → httpOnly cookie, managed by server
   - user profile         → localStorage for UI persistence across page loads
   ───────────────────────────────────────────────────────── */

const AUTH_KEY = "1waymirror_auth_v1";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  plan: "free" | "starter" | "explorer" | "builder" | "accelerator";
};

// ── In-memory token store (cleared on page refresh) ──────
let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

function setAccessToken(token: string | null): void {
  _accessToken = token;
}

// ── User profile (localStorage — survives page refresh) ──
export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function saveAuthUser(user: AuthUser): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function signIn(user: AuthUser): void {
  saveAuthUser(user);
}

export function signOut(): void {
  setAccessToken(null);
  localStorage.removeItem(AUTH_KEY);
  fetch("/api/auth/logout", { method: "POST" }).catch(() => { });
}

export function isLoggedIn(): boolean {
  // Token in memory OR cached user in localStorage (page just refreshed)
  return !!_accessToken || !!getAuthUser();
}

// ── Authenticated fetch helper ────────────────────────────
/**
 * Use this instead of bare fetch() for any protected API call.
 * Automatically sends the Bearer token and silently refreshes if expired.
 */
export async function authFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const doRequest = (token: string | null) =>
    fetch(input, {
      ...init,
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await doRequest(_accessToken);

  // 401 → try to refresh token, then retry once
  if (res.status === 401 && _accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doRequest(_accessToken);
    } else {
      // Refresh failed → force logout
      signOut();
    }
  }

  return res;
}

// ── Token refresh ─────────────────────────────────────────
async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.accessToken ?? null);
    return !!data.accessToken;
  } catch {
    return false;
  }
}

// ── Backend Auth API Integrations ────────────────────────

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

    // Store the access token in memory
    setAccessToken(data.accessToken ?? null);
    // Save user profile to localStorage for UI persistence
    if (data.user) saveAuthUser(data.user);
    return { ok: true, user: data.user };
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

    // Store the access token in memory
    setAccessToken(data.accessToken ?? null);
    // Save user profile to localStorage for UI persistence
    if (data.user) saveAuthUser(data.user);
    return data.user as AuthUser;
  } catch (err) {
    return null;
  }
}

/**
 * Called on app startup to restore session.
 * Uses the httpOnly refresh_token cookie (invisible to JS) to get a
 * new access token silently — no credentials needed.
 */
export async function fetchCurrentSession(): Promise<AuthUser | null> {
  try {
    // Try to get a fresh access token using the httpOnly refresh cookie
    const refreshed = await tryRefresh();
    if (!refreshed) {
      // No valid refresh token → user is logged out
      localStorage.removeItem(AUTH_KEY);
      return null;
    }

    // Now fetch the user profile with the new access token
    const res = await authFetch("/api/auth/me");
    if (!res.ok) return null;

    const data = await res.json();
    const user = data.user as AuthUser;
    saveAuthUser(user);
    return user;
  } catch (err) {
    return null;
  }
}

// ── Legacy localStorage account helpers ──────────────────

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
