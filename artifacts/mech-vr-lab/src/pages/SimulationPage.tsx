import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Loader2,
  Target,
  ShieldAlert,
  Sparkles,
  Trophy,
  Zap,
  Briefcase,
} from "lucide-react";
import {
  useGetSimulation,
  useGenerateNextMission,
  useSubmitMission,
  useGetMissionHint,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SimulationViewer from "@/components/SimulationViewer";
import MultiplayerPanel, { type RoomState } from "@/components/MultiplayerPanel";
import { getLearnerId } from "@/lib/learner";
import NotFound from "./not-found";
import type { Socket } from "socket.io-client";

type Mission = {
  id: string;
  simulationSlug: string;
  category: string;
  topic: string;
  difficulty: number;
  title: string;
  roleIntro: string;
  scenario: string;
  problem: string;
  constraints: string[];
  question: string;
  choices: { id: string; text: string; rationale?: string | null }[];
  scene: { environment: string; params: Record<string, unknown> };
};

type Result = {
  missionId: string;
  correct: boolean;
  correctChoiceId: string;
  explanation: string;
  encouragement: string;
  xpAwarded: number;
  newStreak: number;
  newLevel: number;
  newTotalXp: number;
};

export default function SimulationPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const learnerId = getLearnerId();
  const { data: sim, isLoading: simLoading, isError } = useGetSimulation(slug);

  const [mission, setMission] = useState<Mission | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);

  /* ── Multiplayer state ── */
  const [room, setRoom] = useState<RoomState | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isHostRef = useRef(false);
  const [partnerVoted, setPartnerVoted] = useState(false);
  const [allVotedChoices, setAllVotedChoices] = useState<Record<string, string> | null>(null);

  const generate = useGenerateNextMission();
  const submit = useSubmitMission();
  const getHint = useGetMissionHint();

  const startMission = useMemo(
    () => async (roomCode?: string, isHost?: boolean) => {
      setSelectedChoice(null);
      setResult(null);
      setHint(null);
      setPartnerVoted(false);
      setAllVotedChoices(null);
      const m = (await generate.mutateAsync({
        data: {
          learnerId,
          simulationSlug: slug,
          avoidTopics: recentTopics.slice(-4),
        },
      })) as Mission;
      setMission(m);
      setRecentTopics((prev) => [...prev, m.topic]);

      /* broadcast mission to room if host */
      if (roomCode && isHost && socketRef.current) {
        socketRef.current.emit("room:mission", {
          code: roomCode,
          missionId: m.id,
          mission: m,
        });
      }
    },
    [generate, learnerId, slug, recentTopics],
  );

  useEffect(() => {
    if (sim && !mission && !generate.isPending && !generate.isError) {
      void startMission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  /* ── Multiplayer callbacks ── */
  const handleRoomJoined = useCallback((r: RoomState, socket: Socket, isHost: boolean) => {
    setRoom(r);
    socketRef.current = socket;
    isHostRef.current = isHost;
  }, []);

  const handleRoomUpdate = useCallback((r: RoomState) => {
    setRoom(r);
    if (socketRef.current) {
      const others = r.players.filter(p => p.id !== socketRef.current!.id);
      setPartnerVoted(others.some(p => p.choice !== null));
    }
  }, []);

  const handleMissionReceived = useCallback((m: unknown) => {
    setMission(m as Mission);
    setSelectedChoice(null);
    setResult(null);
    setHint(null);
    setPartnerVoted(false);
    setAllVotedChoices(null);
    setRecentTopics(prev => [...prev, (m as Mission).topic]);
  }, []);

  const handleAllVoted = useCallback((votes: Record<string, string>) => {
    setAllVotedChoices(votes);
  }, []);

  const handleResult = useCallback((res: unknown, correctChoiceId: string) => {
    setResult({ ...(res as Result), correctChoiceId });
  }, []);

  if (simLoading) {
    return <div className="max-w-6xl mx-auto p-8 text-slate-300">Loading career…</div>;
  }
  if (isError || !sim) return <NotFound />;

  const isMultiplayer = !!room;
  const mySocketId = socketRef.current?.id;

  const onChoose = (choiceId: string) => {
    if (result) return;
    setSelectedChoice(choiceId);
    if (isMultiplayer && room && socketRef.current) {
      socketRef.current.emit("room:vote", { code: room.code, choiceId });
    }
  };

  const onSubmit = async () => {
    if (!mission || !selectedChoice) return;

    if (isMultiplayer && !allVotedChoices) {
      return;
    }

    const r = (await submit.mutateAsync({
      id: mission.id,
      data: { learnerId, choiceId: selectedChoice },
    })) as Result;
    setResult(r);

    if (isMultiplayer && room && isHostRef.current && socketRef.current) {
      socketRef.current.emit("room:result", {
        code: room.code,
        result: r,
        correctChoiceId: r.correctChoiceId,
      });
    }
  };

  const onHint = async () => {
    if (!mission || hint || getHint.isPending) return;
    const r = await getHint.mutateAsync({ id: mission.id });
    setHint(r.hint);
  };

  const onNextMission = () => {
    if (isMultiplayer && room && isHostRef.current && socketRef.current) {
      socketRef.current.emit("room:next", { code: room.code });
    }
    void startMission(room?.code, isHostRef.current);
  };

  const env = mission?.scene.environment ?? sim.environment;
  const sceneParams = mission?.scene.params ?? {};

  /* Submit button state */
  const canSubmit = !!selectedChoice && !submit.isPending;
  const waitingForPartners = isMultiplayer && selectedChoice && !allVotedChoices;
  const allVotedCount = allVotedChoices ? Object.keys(allVotedChoices).length : 0;
  const partnerCount = room ? room.players.length : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-gold transition-colors"
          data-testid="link-back"
        >
          <ArrowLeft className="h-4 w-4" /> All career worlds
        </Link>
        <Badge className="bg-[hsl(38_95%_55%)]/15 text-gold border-[hsl(38_95%_55%)]/30 capitalize">
          {sim.category}
        </Badge>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 rounded-xl bg-[hsl(217_50%_10%)] border border-[hsl(217_35%_22%)] flex items-center justify-center">
          <Briefcase className="h-6 w-6 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {sim.title}
          </h1>
          <p className="text-sm text-slate-400">{sim.tagline}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* 3D viewer column */}
        <div className="lg:col-span-3 space-y-3">
          <SimulationViewer environment={env} params={sceneParams} />

          {/* Mission topic card */}
          {mission && (
            <Card className="bg-[hsl(217_50%_10%)] border-[hsl(217_35%_18%)]">
              <CardContent className="p-4 flex items-start gap-3">
                <Target className="h-5 w-5 text-gold mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-widest text-gold font-semibold">
                    Mission topic
                  </div>
                  <div className="text-white font-medium">{mission.topic}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Difficulty {mission.difficulty} / 10
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Multiplayer panel */}
          <MultiplayerPanel
            slug={slug}
            onRoomJoined={handleRoomJoined}
            onRoomUpdate={handleRoomUpdate}
            onMissionReceived={handleMissionReceived}
            onAllVoted={handleAllVoted}
            onResult={handleResult}
          />

          {/* Multiplayer player votes display */}
          {isMultiplayer && room && room.phase === "mission" && mission && (
            <div className="rounded-xl bg-[hsl(217_50%_10%)] border border-[hsl(217_35%_18%)] p-3">
              <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
                Team votes
              </div>
              <div className="flex gap-2 flex-wrap">
                {room.players.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 text-sm">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                    <span className="text-white">{p.name}</span>
                    {p.choice ? (
                      <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px]">
                        {allVotedChoices ? p.choice.toUpperCase() : "✓"}
                      </Badge>
                    ) : (
                      <span className="text-slate-500 text-xs">thinking…</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mission card column */}
        <div className="lg:col-span-2">
          <Card className="bg-[hsl(217_50%_10%)] border-[hsl(217_35%_18%)] h-full">
            <CardContent className="p-6 space-y-5">
              {!mission || generate.isPending ? (
                <div className="flex items-center justify-center min-h-[400px] text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  {isMultiplayer && !isHostRef.current ? "Waiting for host…" : "Generating mission…"}
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-gold font-semibold mb-1">
                      Mission
                    </div>
                    <h2
                      className="text-xl font-bold text-white leading-snug"
                      data-testid="text-mission-title"
                    >
                      {mission.title}
                    </h2>
                  </div>

                  {mission.roleIntro && (
                    <p className="text-sm text-slate-200 italic border-l-2 border-[hsl(38_95%_55%)] pl-3">
                      {mission.roleIntro}
                    </p>
                  )}

                  <p className="text-sm text-slate-200 leading-relaxed">{mission.scenario}</p>

                  {mission.problem && (
                    <div className="rounded-lg bg-[hsl(217_60%_6%)] border border-[hsl(217_35%_22%)] p-3 text-sm text-white">
                      <span className="font-semibold text-gold">Problem: </span>
                      {mission.problem}
                    </div>
                  )}

                  {mission.constraints?.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-1.5 mb-2">
                        <ShieldAlert className="h-3 w-3" /> Constraints
                      </div>
                      <ul className="space-y-1">
                        {mission.constraints.map((c, i) => (
                          <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                            <span className="text-gold mt-1">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-1">
                    <div className="text-sm font-semibold text-white mb-3">{mission.question}</div>
                    <div className="space-y-2">
                      {mission.choices.map((c) => {
                        const isSelected = selectedChoice === c.id;
                        const isCorrect = result && c.id === result.correctChoiceId;
                        const isWrong = result && isSelected && !result.correct;

                        /* In multiplayer show what partners voted after allVoted */
                        const partnerPickedThis =
                          allVotedChoices &&
                          Object.entries(allVotedChoices).some(
                            ([pid, cid]) => pid !== mySocketId && cid === c.id,
                          );
                        const partnerColor = room?.players.find(
                          p => p.id !== mySocketId && allVotedChoices?.[p.id] === c.id,
                        )?.color;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => onChoose(c.id)}
                            disabled={!!result || (isMultiplayer && !!allVotedChoices && !result)}
                            data-testid={`choice-${c.id}`}
                            className={
                              "w-full text-left rounded-lg border px-3 py-2.5 transition-all " +
                              (isCorrect
                                ? "border-emerald-400 bg-emerald-500/15 text-white"
                                : isWrong
                                  ? "border-rose-400 bg-rose-500/15 text-white"
                                  : isSelected
                                    ? "border-gold bg-[hsl(38_95%_55%)]/15 text-white"
                                    : "border-[hsl(217_35%_22%)] bg-[hsl(217_60%_6%)] hover:border-[hsl(38_95%_55%)]/60 text-slate-200")
                            }
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-gold uppercase text-xs mt-0.5">
                                {c.id}.
                              </span>
                              <div className="flex-1">
                                <div className="text-sm">{c.text}</div>
                                {result && c.rationale && (
                                  <div className="text-xs text-slate-400 mt-1 italic">
                                    {c.rationale}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {partnerPickedThis && partnerColor && (
                                  <div
                                    className="h-3 w-3 rounded-full border-2 border-white/40"
                                    style={{ background: partnerColor }}
                                    title="Partner's choice"
                                  />
                                )}
                                {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                                {isWrong && <XCircle className="h-4 w-4 text-rose-400" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {hint && !result && (
                    <div className="rounded-lg bg-[hsl(38_95%_55%)]/10 border border-[hsl(38_95%_55%)]/30 p-3 text-sm text-slate-100 flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                      <span>{hint}</span>
                    </div>
                  )}

                  {result && (
                    <div
                      className={
                        "rounded-lg border p-4 space-y-2 " +
                        (result.correct
                          ? "border-emerald-400/40 bg-emerald-500/10"
                          : "border-rose-400/40 bg-rose-500/10")
                      }
                      data-testid="text-result"
                    >
                      <div className="flex items-center gap-2 font-bold text-white">
                        {result.correct ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            {isMultiplayer ? "Team mission accomplished!" : "Mission accomplished"}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-rose-400" /> Not the best call
                          </>
                        )}
                      </div>
                      <p className="text-sm text-slate-100">{result.explanation}</p>
                      <p className="text-xs italic text-slate-300">{result.encouragement}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge className="bg-[hsl(38_95%_55%)]/15 text-gold border-[hsl(38_95%_55%)]/30">
                          <Trophy className="h-3 w-3 mr-1" /> +{result.xpAwarded} XP
                        </Badge>
                        <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/30">
                          <Sparkles className="h-3 w-3 mr-1" /> Streak {result.newStreak}
                        </Badge>
                        <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30">
                          <Zap className="h-3 w-3 mr-1" /> Lv {result.newLevel}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {!result ? (
                      <>
                        <Button
                          onClick={() => void onSubmit()}
                          disabled={!canSubmit || !!waitingForPartners}
                          className="gradient-gold text-[hsl(217_60%_6%)] font-semibold hover:opacity-90 flex-1"
                          data-testid="button-submit"
                        >
                          {submit.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : waitingForPartners ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                              {`${allVotedCount}/${partnerCount} voted`}
                            </>
                          ) : (
                            "Submit decision"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void onHint()}
                          disabled={getHint.isPending || !!hint}
                          className="border-[hsl(217_35%_28%)] text-white hover:bg-white/5"
                          data-testid="button-hint"
                        >
                          {getHint.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Lightbulb className="h-4 w-4 mr-1.5" /> Hint
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      (!isMultiplayer || isHostRef.current) && (
                        <Button
                          onClick={onNextMission}
                          disabled={generate.isPending}
                          className="gradient-gold text-[hsl(217_60%_6%)] font-semibold hover:opacity-90 flex-1"
                          data-testid="button-next"
                        >
                          {generate.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              {isMultiplayer ? "Next team mission" : "Start next mission"}
                              <ArrowRight className="h-4 w-4 ml-1.5" />
                            </>
                          )}
                        </Button>
                      )
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
