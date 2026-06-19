import { useState, useEffect, useCallback } from "react";
import { Users, Copy, Check, Loader2, UserCheck, UserX, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

export type RoomPlayer = {
  id: string;
  name: string;
  ready: boolean;
  choice: string | null;
  color: string;
};

export type RoomState = {
  code: string;
  slug: string;
  missionId: string | null;
  phase: "lobby" | "mission" | "result";
  players: RoomPlayer[];
  votes: Record<string, string>;
  correctChoiceId: string | null;
};

type Props = {
  slug: string;
  onRoomJoined: (room: RoomState, socket: Socket, isHost: boolean) => void;
  onRoomUpdate: (room: RoomState) => void;
  onMissionReceived: (mission: unknown) => void;
  onAllVoted: (votes: Record<string, string>) => void;
  onResult: (result: unknown, correctChoiceId: string) => void;
};

export default function MultiplayerPanel({
  slug,
  onRoomJoined,
  onRoomUpdate,
  onMissionReceived,
  onAllVoted,
  onResult,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [name, setName] = useState(() => localStorage.getItem("mp_name") || "");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  const saveName = (n: string) => {
    setName(n);
    localStorage.setItem("mp_name", n);
  };

  const handleRoomUpdate = useCallback((r: RoomState) => {
    setRoom(r);
    onRoomUpdate(r);
  }, [onRoomUpdate]);

  const bindSocket = useCallback((s: Socket, hostFlag: boolean, initialRoom: RoomState) => {
    setSocket(s);
    setIsHost(hostFlag);
    setRoom(initialRoom);
    setConnected(s.connected);
    onRoomJoined(initialRoom, s, hostFlag);

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("room:update", handleRoomUpdate);
    s.on("room:mission", ({ mission }: { mission: unknown }) => onMissionReceived(mission));
    s.on("room:allVoted", ({ votes }: { votes: Record<string, string> }) => onAllVoted(votes));
    s.on("room:result", ({ result, correctChoiceId }: { result: unknown; correctChoiceId: string }) =>
      onResult(result, correctChoiceId));
  }, [handleRoomUpdate, onRoomJoined, onMissionReceived, onAllVoted, onResult]);

  const createRoom = async () => {
    if (!name.trim()) { setError("Enter your name first"); return; }
    setLoading(true); setError("");
    const s = getSocket();
    s.emit("room:create", { name: name.trim(), slug }, (res: { ok: boolean; room: RoomState; error?: string }) => {
      setLoading(false);
      if (!res.ok) { setError(res.error ?? "Failed"); return; }
      bindSocket(s, true, res.room);
    });
  };

  const joinRoom = async () => {
    if (!name.trim()) { setError("Enter your name first"); return; }
    if (!joinCode.trim()) { setError("Enter a room code"); return; }
    setLoading(true); setError("");
    const s = getSocket();
    s.emit("room:join", { name: name.trim(), code: joinCode.trim() }, (res: { ok: boolean; room: RoomState; error?: string }) => {
      setLoading(false);
      if (!res.ok) { setError(res.error ?? "Room not found"); return; }
      bindSocket(s, false, res.room);
    });
  };

  const toggleReady = () => {
    if (!socket || !room) return;
    socket.emit("room:ready", { code: room.code });
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    return () => { socket?.off("room:update"); };
  }, [socket]);

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-[hsl(217_35%_28%)] text-white hover:bg-white/5 gap-2"
      >
        <Users className="h-4 w-4" />
        Multiplayer
      </Button>
    );
  }

  return (
    <Card className="bg-[hsl(217_45%_9%)] border-[hsl(217_35%_20%)] w-full">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gold" />
            <span className="text-sm font-semibold text-white">Multiplayer</span>
            {socket && (
              <Badge className={connected ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}>
                {connected ? <><Wifi className="h-3 w-3 mr-1"/>Live</> : <><WifiOff className="h-3 w-3 mr-1"/>Offline</>}
              </Badge>
            )}
          </div>
          {!room && (
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
          )}
        </div>

        {!room ? (
          <>
            {/* Name input */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Your name</label>
              <input
                type="text"
                value={name}
                onChange={e => saveName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={20}
                className="w-full bg-[hsl(217_60%_6%)] border border-[hsl(217_35%_22%)] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-gold placeholder:text-slate-500"
              />
            </div>

            {mode === "none" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setMode("create")} className="flex-1 gradient-gold text-[hsl(217_60%_6%)] font-semibold">
                  Create Room
                </Button>
                <Button size="sm" onClick={() => setMode("join")} variant="outline" className="flex-1 border-[hsl(217_35%_28%)] text-white hover:bg-white/5">
                  Join Room
                </Button>
              </div>
            )}

            {mode === "create" && (
              <>
                <p className="text-xs text-slate-400">Create a room and share the code with a friend. You'll both tackle the same mission together!</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createRoom} disabled={loading} className="flex-1 gradient-gold text-[hsl(217_60%_6%)] font-semibold">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & Start"}
                  </Button>
                  <Button size="sm" onClick={() => setMode("none")} variant="ghost" className="text-slate-400">Back</Button>
                </div>
              </>
            )}

            {mode === "join" && (
              <>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Room code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AB3XY"
                    maxLength={6}
                    className="w-full bg-[hsl(217_60%_6%)] border border-[hsl(217_35%_22%)] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-gold font-mono tracking-widest placeholder:text-slate-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={joinRoom} disabled={loading} className="flex-1 gradient-gold text-[hsl(217_60%_6%)] font-semibold">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Room"}
                  </Button>
                  <Button size="sm" onClick={() => setMode("none")} variant="ghost" className="text-slate-400">Back</Button>
                </div>
              </>
            )}

            {error && <p className="text-xs text-rose-400">{error}</p>}
          </>
        ) : (
          <>
            {/* Room code */}
            {room.phase === "lobby" && (
              <div className="rounded-lg bg-[hsl(217_60%_6%)] border border-[hsl(217_35%_22%)] p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">Room Code</div>
                  <div className="text-2xl font-black text-white tracking-widest font-mono">{room.code}</div>
                </div>
                <Button size="sm" onClick={copyCode} variant="ghost" className="text-gold hover:text-gold/80">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* Players list */}
            <div className="space-y-2">
              {room.players.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-[hsl(217_60%_6%)] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-sm text-white font-medium">{p.name}</span>
                    {p.id === socket?.id && <Badge className="text-[9px] bg-gold/15 text-gold border-gold/30">You</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.choice && room.phase === "mission" && (
                      <Badge className="bg-[hsl(38_95%_55%)]/15 text-gold border-[hsl(38_95%_55%)]/30 text-[10px]">Voted</Badge>
                    )}
                    {room.phase === "lobby" && (
                      p.ready
                        ? <UserCheck className="h-4 w-4 text-emerald-400" />
                        : <UserX className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Waiting message */}
            {room.phase === "lobby" && room.players.length < 2 && (
              <p className="text-xs text-slate-400 text-center">
                Share code <span className="font-mono font-bold text-gold">{room.code}</span> with a friend to start!
              </p>
            )}

            {/* Ready button */}
            {room.phase === "lobby" && room.players.length >= 2 && (
              <Button size="sm" onClick={toggleReady} className="w-full gradient-gold text-[hsl(217_60%_6%)] font-semibold">
                {room.players.find(p => p.id === socket?.id)?.ready ? "✓ Ready! Waiting…" : "I'm Ready!"}
              </Button>
            )}

            {room.phase === "mission" && (
              <div className="text-xs text-slate-400 text-center">
                {Object.keys(room.votes).length} / {room.players.length} voted
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
