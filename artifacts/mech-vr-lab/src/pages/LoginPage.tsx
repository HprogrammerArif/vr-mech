import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, LogIn, ShieldCheck, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { signIn, registerAccount, verifyAccount } from "@/lib/auth";
import { getOrCreateLearnerId, saveProfile, getProfile } from "@/lib/profile";
import {
  isDisposableEmail, isSchoolEmail, validateAgeGradeConsistency,
  saveSafetyProfile, calculateTrustScore, getTrustBadge,
} from "@/lib/safety";

const BASE = import.meta.env.BASE_URL ?? "/";

const CAREER_INTERESTS = [
  "Engineering", "Technology / Software", "Healthcare / Medicine",
  "Business / Finance", "Skilled Trades", "Law & Public Service",
  "Science & Research", "Creative & Design", "Entrepreneurship",
  "Education", "Not sure yet — exploring!",
];

const GRADES = [7, 8, 9, 10, 11, 12];

type Mode = "login" | "register";

function Field({ label, type = "text", value, onChange, placeholder, required }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${focused ? "#f5a524" : "rgba(255,255,255,0.12)"}`,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("login");

  /* ── Login fields ── */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  /* ── Register: basic ── */
  const [name, setName] = useState("");
  const [careerInterests, setCareerInterests] = useState<string[]>([]);

  /* ── Register: student info ── */
  const [birthdate, setBirthdate] = useState("");
  const [grade, setGrade] = useState<string>("");
  const [graduationYear, setGraduationYear] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");

  /* ── Register: parent info ── */
  const [showParent, setShowParent] = useState(false);
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [noParentContact, setNoParentContact] = useState(false);
  const [counselorEmail, setCounselorEmail] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ageWarning, setAgeWarning] = useState("");

  /* Live age-grade consistency check */
  const checkAgeGrade = (bd: string, gr: string) => {
    if (!bd || !gr) { setAgeWarning(""); return; }
    const result = validateAgeGradeConsistency(bd, parseInt(gr, 10));
    setAgeWarning(result.valid ? "" : result.reason ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) { setError("Please fill in all required fields."); return; }
    if (mode === "register" && !name.trim()) { setError("Please enter your name."); return; }
    if (mode === "register" && name.trim().length < 2) { setError("Name must be at least 2 characters."); return; }
    if (!email.includes("@")) { setError("Please enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    if (mode === "register") {
      if (isDisposableEmail(email)) {
        setError("Please use a real email address — disposable email services are not allowed.");
        return;
      }
      if (!grade) { setError("Please select your current grade."); return; }
      if (!birthdate) { setError("Please enter your date of birth."); return; }

      /* Age-grade consistency */
      const consistency = validateAgeGradeConsistency(birthdate, parseInt(grade, 10));
      if (!consistency.valid) {
        setError(`Age & grade mismatch: ${consistency.reason ?? "please double-check"}`);
        return;
      }

      /* Require parent info or explicit opt-out */
      if (!noParentContact && !parentEmail) {
        setError("Please enter a parent/guardian email — or check 'No parent contact available' below.");
        return;
      }
      if (parentEmail && !parentEmail.includes("@")) {
        setError("Parent email address appears invalid.");
        return;
      }
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 400));

    if (mode === "register") {
      const learnerId = getOrCreateLearnerId();
      const result = await registerAccount(name.trim(), email.trim(), password, learnerId);
      if (!result.ok) { setError(result.error ?? "Registration failed."); setLoading(false); return; }

      signIn(name.trim(), email.trim().toLowerCase());
      saveProfile({
        learnerId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        careerInterest: careerInterests[0] || "",
        careerInterests,
        avatarId: "nova",
        school: schoolName || undefined,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : undefined,
      });

      /* Compute local safety profile */
      const schoolVerified = isSchoolEmail(schoolEmail || email);
      const parentVerified = !noParentContact && !!parentEmail;
      const score = calculateTrustScore({
        schoolEmailVerified: schoolVerified,
        parentVerified,
        phoneVerified: false,
        accountAgeDays: 0,
        noFlagsBonus: true,
        tier2Flags: 0,
        tier3Flags: 0,
        ageConsistencyFailed: false,
        noParentContact,
      });

      saveSafetyProfile({
        studentId: learnerId,
        verificationTier: schoolVerified ? "A" : parentVerified ? "B" : "C",
        trustScore: score,
        trustBadge: getTrustBadge(score),
        parentEmail: parentEmail || undefined,
        parentName: parentName || undefined,
        parentVerified,
        schoolEmailVerified: schoolVerified,
        supervisedMode: true,
        dmEnabled: false,
        messagingPaused: false,
        noParentContact,
        grade: grade ? parseInt(grade, 10) : undefined,
        birthdate: birthdate || undefined,
        schoolName: schoolName || undefined,
      });

      /* Register with API (non-blocking) */
      void fetch("/api/safety/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learnerId, email: email.trim(), name: name.trim(),
          birthdate, grade: grade ? parseInt(grade, 10) : undefined,
          graduationYear: graduationYear ? parseInt(graduationYear, 10) : undefined,
          schoolName, schoolEmail,
          careerInterests,
          parentName, parentEmail, parentPhone, parentRelationship: "parent",
          noParentContact, counselorEmail,
        }),
      }).catch(() => { /* noop — local profile already saved */ });

      setLoading(false);
      navigate("/my-profile");
    } else {
      const account = await verifyAccount(email.trim(), password);
      if (!account) {
        const existing = getProfile();
        if (existing?.email === email.trim().toLowerCase()) {
          signIn(existing.name, existing.email);
          setLoading(false);
          navigate("/replitopolis");
          return;
        }
        setError("Invalid email or password. Don't have an account? Sign up above.");
        setLoading(false);
        return;
      }
      signIn(account.name, account.email);
      const learnerId = getOrCreateLearnerId();
      const existing = getProfile();
      saveProfile({
        learnerId: account.learnerId ?? learnerId,
        name: account.name,
        email: account.email,
        careerInterest: existing?.careerInterest ?? "",
        avatarId: existing?.avatarId ?? "nova",
        school: existing?.school,
        graduationYear: existing?.graduationYear,
        gpa: existing?.gpa,
        sat: existing?.sat,
      });
      setLoading(false);
      navigate("/replitopolis");
    }
  };

  const inputStyle = (focused: boolean) => ({
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${focused ? "#f5a524" : "rgba(255,255,255,0.12)"}`,
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 60% 0%, #0d1f3c 0%, #0a1428 70%)" }}>

      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "linear-gradient(rgba(245,165,36,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,165,36,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: "#f5a524" }} />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: "#3b82f6" }} />

      <div className="relative z-10 w-full max-w-md my-8">
        <div className="text-center mb-8">
          <Link href="/">
            <img src={`${BASE}logo.png`} alt="1WayMirror" className="h-16 w-auto object-contain mx-auto mb-4 cursor-pointer" />
          </Link>
          <h1 className="text-2xl font-black text-white">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {mode === "login" ? "Sign in to continue exploring careers" : "Start your 7-day free trial"}
          </p>
        </div>

        <div className="rounded-2xl p-7"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>

          <div className="flex rounded-xl overflow-hidden mb-6"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {(["login", "register"] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-2.5 text-sm font-semibold transition-all"
                style={mode === m
                  ? { background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }
                  : { color: "#94a3b8" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── Basic info ── */}
            {mode === "register" && (
              <Field label="Full Name" value={name} onChange={setName} placeholder="Your full name" required />
            )}

            <Field label="Email Address" type="email" value={email} onChange={setEmail}
              placeholder={mode === "register" ? "you@school.edu or personal email" : "your@email.com"} required />

            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                Password<span className="text-red-400 ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all pr-12"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* ── Register-only fields ── */}
            {mode === "register" && (
              <>
                {/* Career interests — multi-select chips (pick up to 2) */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                    Career Interests <span className="text-slate-500 normal-case">(pick up to 2)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CAREER_INTERESTS.map(c => {
                      const selected = careerInterests.includes(c);
                      const maxed = !selected && careerInterests.length >= 2;
                      return (
                        <button key={c} type="button" disabled={maxed}
                          onClick={() => setCareerInterests(prev =>
                            prev.includes(c) ? prev.filter(i => i !== c) : [...prev, c]
                          )}
                          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left leading-snug"
                          style={selected
                            ? { background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }
                            : maxed
                            ? { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", color: "#374151", cursor: "not-allowed" }
                            : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  {careerInterests.length > 0 && (
                    <div className="text-xs mt-1.5" style={{ color: "#f5a524" }}>{careerInterests.length}/2 selected</div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Student Info</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>

                {/* Grade + Birth date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                      Current Grade<span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <select value={grade}
                      onChange={e => { setGrade(e.target.value); checkAgeGrade(birthdate, e.target.value); }}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: grade ? "white" : "#64748b" }}>
                      <option value="" style={{ background: "#0d1f3c" }}>Grade…</option>
                      {GRADES.map(g => (
                        <option key={g} value={String(g)} style={{ background: "#0d1f3c" }}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                      Date of Birth<span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <input type="date" value={birthdate}
                      onChange={e => { setBirthdate(e.target.value); checkAgeGrade(e.target.value, grade); }}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", colorScheme: "dark" }} />
                  </div>
                </div>
                {ageWarning && (
                  <div className="text-xs text-yellow-400 flex items-center gap-2 px-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {ageWarning}
                  </div>
                )}

                {/* Graduation year + School */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">Graduation Year</label>
                    <input type="number" value={graduationYear}
                      onChange={e => setGraduationYear(e.target.value)}
                      placeholder={String(new Date().getFullYear() + 2)}
                      min="2024" max="2032"
                      className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }} />
                  </div>
                  <Field label="School Name" value={schoolName} onChange={setSchoolName} placeholder="Jefferson High" />
                </div>

                {/* School email */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                    School Email <span className="text-slate-600 normal-case">(if you have one)</span>
                  </label>
                  <input type="email" value={schoolEmail}
                    onChange={e => setSchoolEmail(e.target.value)}
                    placeholder="you@district.k12.oh.us or you@school.edu"
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }} />
                  {isSchoolEmail(schoolEmail) && schoolEmail && (
                    <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
                      <ShieldCheck className="h-3 w-3" /> School email detected — higher trust tier
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Parent / Guardian</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>

                {/* Safety notice */}
                <div className="rounded-xl p-3 flex items-start gap-2.5"
                  style={{ background: "rgba(29,78,216,0.12)", border: "1px solid rgba(29,78,216,0.25)" }}>
                  <ShieldCheck className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-200 text-xs leading-relaxed">
                    1WayMirror is built for students ages 12–18. We require a parent or guardian email so they can stay informed about your activity. This is how we keep the platform safe for everyone.
                  </p>
                </div>

                {!noParentContact && (
                  <>
                    <button type="button"
                      onClick={() => setShowParent(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors hover:bg-white/5"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" style={{ color: "#f5a524" }} />
                        Parent / Guardian Info {!parentEmail && <span className="text-red-400 text-xs">Required</span>}
                        {parentEmail && <span className="text-green-400 text-xs">✓ Added</span>}
                      </span>
                      {showParent ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>

                    {showParent && (
                      <div className="space-y-3 pl-2"
                        style={{ borderLeft: "2px solid rgba(245,165,36,0.3)" }}>
                        <Field label="Parent/Guardian Name" value={parentName} onChange={setParentName} placeholder="Jane Smith" />
                        <Field label="Parent/Guardian Email" type="email" value={parentEmail} onChange={setParentEmail}
                          placeholder="parent@email.com" required />
                        <Field label="Parent/Guardian Phone (optional)" value={parentPhone} onChange={setParentPhone} placeholder="+1 (555) 000-0000" />
                      </div>
                    )}
                  </>
                )}

                {/* No parent contact */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={noParentContact}
                    onChange={e => { setNoParentContact(e.target.checked); if (e.target.checked) setShowParent(false); }}
                    className="mt-0.5 accent-orange-500" />
                  <div>
                    <span className="text-sm text-slate-300">No parent contact available</span>
                    <p className="text-xs text-slate-500 mt-0.5">Your account will be in enhanced monitoring mode with a trust score cap of 75/100.</p>
                  </div>
                </label>

                {noParentContact && (
                  <Field label="School Counselor Email (optional, encouraged)"
                    type="email" value={counselorEmail} onChange={setCounselorEmail}
                    placeholder="counselor@school.edu" />
                )}
              </>
            )}

            {error && (
              <div className="text-sm text-red-400 flex items-start gap-2 px-4 py-3 rounded-xl"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: loading ? "rgba(245,165,36,0.5)" : "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }}>
              {loading ? (
                <div className="h-4 w-4 border-2 border-[#0a1428]/30 border-t-[#0a1428] rounded-full animate-spin" />
              ) : <LogIn className="h-4 w-4" />}
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Start 7-Day Free Trial"}
            </button>

            {mode === "register" && (
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                By creating an account you agree to our{" "}
                <a href="#" className="text-blue-400 hover:underline">Terms of Service</a> and{" "}
                <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>.
                This platform is for students ages 12–18.
              </p>
            )}
          </form>
        </div>

        <div className="flex items-center justify-center gap-4 mt-5 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">← Home</Link>
          <span>·</span>
          <Link href="/parent" className="hover:text-slate-300 transition-colors">Parent Portal</Link>
        </div>
      </div>
    </div>
  );
}
