import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, CreditCard, Lock, Check, Zap, Star, Rocket, Crown, ArrowRight } from "lucide-react";
import { getProfile, saveSubscriptionPlan, getSubscriptionPlan, PLAN_LABELS, PLAN_PRICES, PLAN_COLORS, PLAN_DARIO_CREDITS, type SubscriptionPlan } from "@/lib/profile";

const PLAN_RANK: Record<SubscriptionPlan, number> = { none: 0, starter: 1, explorer: 2, builder: 3, accelerator: 4 };

const PLAN_DETAILS = [
  {
    id: "starter" as SubscriptionPlan,
    label: "Starter",
    price: 19.99,
    annualPrice: 16.59,
    annualTotal: 199,
    color: "#3b82f6",
    icon: Zap,
    features: [
      "All 85+ career simulations",
      "2 live streams/month",
      "Profile sharing",
      "No Dario AI credits",
    ],
  },
  {
    id: "explorer" as SubscriptionPlan,
    label: "Explorer",
    price: 49.99,
    annualPrice: 41.49,
    annualTotal: 499,
    color: "#f5a524",
    icon: Zap,
    features: [
      "200 Dario AI credits/month",
      "All 85+ career simulations",
      "Career Compare tool",
      "Career Roadmap",
      "7 live streams/month",
      "Profile sharing",
    ],
  },
  {
    id: "builder" as SubscriptionPlan,
    label: "Builder",
    price: 99.99,
    annualPrice: 82.99,
    annualTotal: 995,
    color: "#f5a524",
    icon: Star,
    popular: true,
    features: [
      "700 Dario AI credits/month",
      "Everything in Explorer",
      "Personality Insights",
      "Career Report",
      "Opportunities Board",
      "Action Items",
      "All live streams",
    ],
  },
  {
    id: "accelerator" as SubscriptionPlan,
    label: "Accelerator",
    price: 199.99,
    annualPrice: 165.99,
    annualTotal: 1991,
    color: "#a855f7",
    icon: Crown,
    features: [
      "1,200 Dario AI credits/month",
      "Everything in Builder",
      "1-on-1 advisor sessions",
      "Priority support",
    ],
  },
];

function getQueryParam(key: string): string {
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

export default function UpgradePage() {
  const [, navigate] = useLocation();
  const profile = getProfile();
  const currentPlan = getSubscriptionPlan();
  const currentRank = PLAN_RANK[currentPlan];

  // Pre-select plan from ?plan= query param, falling back to first upgrade above current
  const paramPlan = getQueryParam("plan") as SubscriptionPlan;
  const fromPlan = (getQueryParam("from") || currentPlan) as SubscriptionPlan;
  const defaultSelected = PLAN_DETAILS.find(p => p.id === paramPlan)?.id
    ?? PLAN_DETAILS.find(p => PLAN_RANK[p.id] > currentRank)?.id
    ?? "explorer";

  // Only show plans that are upgrades from current
  const upgradablePlans = PLAN_DETAILS.filter(p => PLAN_RANK[p.id] > currentRank);

  const [selectedPlan, setSelectedPlan] = useState(defaultSelected);
  const [annual, setAnnual] = useState(false);
  const [cardName, setCardName] = useState(profile?.name ?? "");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [zip, setZip] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const plan = PLAN_DETAILS.find(p => p.id === selectedPlan) ?? PLAN_DETAILS[1];
  const price = annual ? plan.annualPrice : plan.price;
  const currentPlanDetails = PLAN_DETAILS.find(p => p.id === fromPlan);
  const currentPrice = currentPlanDetails ? (annual ? currentPlanDetails.annualPrice : currentPlanDetails.price) : 0;
  const priceDelta = price - currentPrice;
  const billingLabel = annual ? `$${plan.annualTotal}/yr billed annually` : "billed monthly";

  function formatCard(val: string) {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }
  function formatExpiry(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }

  function validate() {
    if (!cardName.trim()) return "Please enter the name on your card.";
    if (cardNumber.replace(/\s/g, "").length < 16) return "Please enter a valid 16-digit card number.";
    if (expiry.length < 5) return "Please enter a valid expiry date (MM/YY).";
    if (cvv.length < 3) return "Please enter a valid CVV.";
    if (!zip.trim()) return "Please enter your billing zip code.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1800));
    setProcessing(false);
    saveSubscriptionPlan(selectedPlan as SubscriptionPlan);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "linear-gradient(135deg, hsl(217 60% 6%), hsl(220 50% 10%))" }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}>
            <Check className="h-10 w-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">You're upgraded!</h2>
          <p className="text-slate-400 mb-2">
            Welcome to <span className="font-bold" style={{ color: plan.color }}>{plan.label}</span>.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Your new plan is active. {PLAN_DARIO_CREDITS[plan.id] > 0 ? `You now have ${PLAN_DARIO_CREDITS[plan.id]} Dario AI credits/month.` : ""}
          </p>
          {PLAN_DARIO_CREDITS[plan.id] > 0 && (
            <button
              onClick={() => navigate("/dario")}
              className="w-full py-3.5 rounded-2xl font-black text-white mb-3 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)` }}>
              Open Dario AI →
            </button>
          )}
          <button
            onClick={() => navigate("/replitopolis")}
            className="w-full py-3 rounded-2xl font-semibold text-slate-400 hover:text-white transition-colors text-sm">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // No upgrades available (already on top plan)
  if (upgradablePlans.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "linear-gradient(135deg, hsl(217 60% 6%), hsl(220 50% 10%))" }}>
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">👑</div>
          <h2 className="text-3xl font-black text-white mb-2">You're at the top!</h2>
          <p className="text-slate-400 mb-8">You're already on the Accelerator plan — our highest tier.</p>
          <button onClick={() => navigate("/replitopolis")}
            className="px-8 py-3 rounded-2xl font-black text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#f5a524,#ea580c)" }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen"
      style={{ background: "linear-gradient(135deg, hsl(217 60% 6%), hsl(220 50% 10%))" }}>

      {/* Top bar */}
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: "rgba(10,18,40,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => navigate("/replitopolis")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-semibold">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" /> Secure checkout
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Upgrade context banner */}
        {currentPlan !== "none" && (
          <div className="flex items-center gap-3 rounded-2xl px-5 py-4 mb-8"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400 mb-0.5">Currently on</div>
              <div className="text-sm font-black" style={{ color: PLAN_COLORS[fromPlan] }}>
                {PLAN_LABELS[fromPlan]} — {PLAN_PRICES[fromPlan]}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-600 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <div className="text-xs text-slate-400 mb-0.5">Upgrading to</div>
              <div className="text-sm font-black" style={{ color: plan.color }}>
                {plan.label} — ${price.toFixed(2)}/mo
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">
            {currentPlan === "none" ? "Choose Your Plan" : "Upgrade Your Plan"}
          </h1>
          <p className="text-slate-400">
            {currentPlan === "none"
              ? "Unlock Dario AI and advanced career tools"
              : `You'll only pay the difference — $${Math.max(0, priceDelta).toFixed(2)}/mo more`}
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <span className="text-sm text-slate-400 font-semibold">Monthly</span>
            <button
              onClick={() => setAnnual(v => !v)}
              className="relative w-12 h-6 rounded-full transition-all"
              style={{ background: annual ? "#f5a524" : "rgba(255,255,255,0.1)" }}>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: annual ? "translateX(24px)" : "translateX(0)" }} />
            </button>
            <span className="text-sm font-semibold" style={{ color: annual ? "#f5a524" : "#64748b" }}>
              Annual <span className="text-xs">(save 17%)</span>
            </span>
          </div>
        </div>

        {/* Plan cards — only upgradable plans */}
        <div className={`grid gap-3 mb-8 ${upgradablePlans.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : upgradablePlans.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {upgradablePlans.map(p => {
            const Icon = p.icon;
            const isSelected = selectedPlan === p.id;
            const pPrice = annual ? p.annualPrice : p.price;
            const delta = pPrice - currentPrice;
            return (
              <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                className="relative rounded-2xl p-4 text-left transition-all hover:scale-[1.02]"
                style={{
                  background: isSelected ? `${p.color}12` : "rgba(255,255,255,0.03)",
                  border: isSelected ? `2px solid ${p.color}60` : "2px solid rgba(255,255,255,0.06)",
                }}>
                {p.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-black"
                    style={{ background: p.color, color: "#0a1428" }}>
                    POPULAR
                  </div>
                )}
                <Icon className="h-5 w-5 mb-2" style={{ color: p.color }} />
                <div className="text-xs font-black text-white mb-1">{p.label}</div>
                <div className="text-lg font-black" style={{ color: p.color }}>
                  ${pPrice.toFixed(2)}
                </div>
                <div className="text-[9px] text-slate-500">/month</div>
                {currentPlan !== "none" && (
                  <div className="text-[9px] mt-1" style={{ color: delta > 0 ? "#94a3b8" : "#22c55e" }}>
                    +${delta.toFixed(2)}/mo vs current
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: p.color }}>
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Feature list */}
        <div className="rounded-2xl p-4 mb-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
            {plan.label} includes:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {plan.features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Payment form */}
        <form onSubmit={handleSubmit}
          className="rounded-2xl p-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-black text-white">Payment Details</span>
            <div className="flex-1" />
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[10px] text-slate-500">256-bit SSL</span>
          </div>

          <div className="mb-4">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Name on Card</label>
            <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Full name"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>

          <div className="mb-4">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Card Number</label>
            <input value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))}
              placeholder="1234 5678 9012 3456" inputMode="numeric"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none font-mono tracking-wider"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Expiry</label>
              <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY" inputMode="numeric"
                className="w-full px-3 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none font-mono"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">CVV</label>
              <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="•••" inputMode="numeric" type="password"
                className="w-full px-3 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none font-mono"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Billing ZIP</label>
              <input value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="12345" inputMode="numeric"
                className="w-full px-3 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none font-mono"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-400"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          {/* Order summary */}
          <div className="rounded-xl px-4 py-4 mb-5 space-y-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {currentPlan !== "none" && currentPlanDetails && (
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Current plan ({PLAN_LABELS[fromPlan]})</span>
                <span>-${currentPrice.toFixed(2)}/mo</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">{plan.label} Plan — {annual ? "Annual" : "Monthly"}</span>
              <span className="text-sm font-black text-white">${price.toFixed(2)}/mo</span>
            </div>
            {currentPlan !== "none" && (
              <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
                <span className="text-xs font-bold text-white">You pay today</span>
                <span className="text-sm font-black" style={{ color: plan.color }}>
                  +${Math.max(0, priceDelta).toFixed(2)}/mo
                </span>
              </div>
            )}
            <div className="text-[10px] text-slate-500">{billingLabel}</div>
          </div>

          <button type="submit" disabled={processing}
            className="w-full py-4 rounded-2xl font-black text-base transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`, color: "#0a1428" }}>
            {processing ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                {currentPlan !== "none" ? `Upgrade to ${plan.label}` : `Start ${plan.label}`}
                <Rocket className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-slate-600 mt-3">
            Cancel anytime · Secure 256-bit encryption · Stripe-powered payments
          </p>
        </form>
      </div>
    </div>
  );
}
