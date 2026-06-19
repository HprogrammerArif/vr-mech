import { Link } from "wouter";
import { Trophy, Flame, Zap, Building2, UserCircle } from "lucide-react";
import { useGetProgress } from "@workspace/api-client-react";
import { getLearnerId } from "@/lib/learner";
import { getAuthUser } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL ?? "/";

export default function HeaderBar() {
  const learnerId = getLearnerId();
  const { data } = useGetProgress({ learnerId });
  const authUser = getAuthUser();

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-[hsl(217_60%_6%)]/90 border-b border-[hsl(217_35%_18%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group" data-testid="link-home">
          <img
            src={`${BASE}logo.png`}
            alt="1WayMirror"
            className="h-10 w-auto object-contain"
          />
          <div className="leading-tight">
            <div className="font-black tracking-tight text-white text-base">
              1WayMirror
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
              Career Services
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/replitopolis"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(38_95%_55%)]/15 border border-[hsl(38_95%_55%)]/40 text-gold text-xs font-semibold hover:bg-[hsl(38_95%_55%)]/25 transition-colors"
          >
            🌐 Dashboard
          </Link>
          <Link
            href="/city"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(217_50%_10%)] border border-[hsl(217_35%_18%)] text-slate-300 text-xs font-semibold hover:text-white hover:border-white/20 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" /> 3D City
          </Link>
          <Stat icon={<Zap className="h-4 w-4 text-gold" />} label="Lv" value={data?.level ?? 1} />
          <Stat icon={<Trophy className="h-4 w-4 text-gold" />} label="XP" value={data?.totalXp ?? 0} />
          <Stat icon={<Flame className="h-4 w-4 text-orange-400" />} label="Streak" value={data?.streak ?? 0} />
          <Link
            href={authUser ? "/my-profile" : "/login"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(217_50%_10%)] border border-[hsl(217_35%_18%)] text-slate-300 text-xs font-semibold hover:text-white hover:border-white/20 transition-colors"
          >
            <UserCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{authUser ? authUser.name.split(" ")[0] : "Sign In"}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(217_50%_10%)] border border-[hsl(217_35%_18%)]"
      data-testid={`stat-${label.toLowerCase()}`}
    >
      {icon}
      <span className="text-slate-400 text-xs">{label}</span>
      <span className="font-semibold tabular-nums text-white">{value}</span>
    </div>
  );
}
