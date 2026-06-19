import { AlertTriangle, X, Send, Edit2 } from "lucide-react";
import type { DetectionType } from "@/lib/contactDetection";
import { detectionTypeLabel } from "@/lib/contactDetection";

interface ContactWarningModalProps {
  types: DetectionType[];
  onSendAnyway: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

export default function ContactWarningModal({
  types, onSendAnyway, onEdit, onCancel,
}: ContactWarningModalProps) {
  const typeLabels = types.map(detectionTypeLabel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0f1d35", border: "1px solid rgba(245,165,36,0.35)" }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(245,165,36,0.15)", border: "1px solid rgba(245,165,36,0.3)" }}>
            <AlertTriangle className="h-5 w-5" style={{ color: "#f5a524" }} />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-black text-base">Heads up before you send</h3>
            <p className="text-slate-400 text-sm mt-0.5">
              Your message appears to contain {typeLabels.join(" or ")}.
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors ml-2 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="rounded-xl p-4 mb-5 space-y-2.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-start gap-2.5">
              <span className="text-green-400 text-base leading-none mt-0.5">✓</span>
              <p className="text-slate-300 text-sm">
                <strong className="text-white">Your parent or guardian will get an email</strong> about this exchange — that's how we keep 1WayMirror safe for everyone.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-green-400 text-base leading-none mt-0.5">✓</span>
              <p className="text-slate-300 text-sm">
                <strong className="text-white">This conversation is saved</strong> for safety review so our team can make sure everyone stays protected.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-green-400 text-base leading-none mt-0.5">✓</span>
              <p className="text-slate-300 text-sm">
                <strong className="text-white">You can absolutely continue</strong> — we just want to keep things transparent and safe.
              </p>
            </div>
          </div>

          <p className="text-slate-400 text-xs mb-5 text-center leading-relaxed">
            This is part of how 1WayMirror keeps all students safe.{" "}
            <a href="https://1waymirror.world/safety" className="text-blue-400 hover:underline">
              Learn more about our safety policies →
            </a>
          </p>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={onCancel}
              className="py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Cancel
            </button>
            <button onClick={onEdit}
              className="py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 flex items-center justify-center gap-1.5"
              style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", color: "#60a5fa" }}>
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={onSendAnyway}
              className="py-2.5 rounded-xl text-sm font-black transition-all hover:scale-105 flex items-center justify-center gap-1.5"
              style={{ background: "linear-gradient(135deg, #f5a524, #ea580c)", color: "#0a1428" }}>
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
