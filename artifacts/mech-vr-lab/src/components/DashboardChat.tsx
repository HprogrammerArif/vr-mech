import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, ChevronLeft, Circle, Users } from "lucide-react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

type OnlineUser = {
  id: string;
  name: string;
  avatarEmoji: string;
  learnerId: string;
  color: string;
};

type DmPayload = {
  fromId: string;
  fromName: string;
  fromEmoji: string;
  fromColor: string;
  message: string;
  ts: number;
  toId?: string;
  toName?: string;
};

type DmMessage = DmPayload & { isMine: boolean };

type DmThread = {
  userId: string;
  userName: string;
  userEmoji: string;
  userColor: string;
  messages: DmMessage[];
  unread: number;
};

type Props = {
  myName: string;
  myEmoji: string;
  myLearnerId: string;
  onOnlineCount: (count: number) => void;
};

export default function DashboardChat({ myName, myEmoji, myLearnerId, onOnlineCount }: Props) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [mySocketId, setMySocketId] = useState("");
  const [threads, setThreads] = useState<Record<string, DmThread>>({});
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [dmInput, setDmInput] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalUnread = Object.values(threads).reduce((acc, t) => acc + t.unread, 0);

  const updateCount = useCallback(
    (list: OnlineUser[], myId: string) => {
      onOnlineCount(list.length);
    },
    [onOnlineCount]
  );

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const doJoin = () => {
      setMySocketId(socket.id ?? "");
      socket.emit("dashboard:join", {
        name: myName || "Explorer",
        avatarEmoji: myEmoji || "🎮",
        learnerId: myLearnerId,
      });
    };

    if (socket.connected) doJoin();
    socket.on("connect", doJoin);
    socket.on("reconnect", doJoin);

    socket.on("dashboard:all", (list: OnlineUser[]) => {
      setMySocketId(socket.id ?? "");
      setUsers(list);
      updateCount(list, socket.id ?? "");
    });

    socket.on("dashboard:joined", (user: OnlineUser) => {
      setUsers(prev => {
        const next = [...prev.filter(u => u.id !== user.id), user];
        updateCount(next, socket.id ?? "");
        return next;
      });
    });

    socket.on("dashboard:left", ({ id }: { id: string }) => {
      setUsers(prev => {
        const next = prev.filter(u => u.id !== id);
        updateCount(next, socket.id ?? "");
        return next;
      });
    });

    socket.on("dashboard:dmMsg", (msg: DmPayload) => {
      setThreads(prev => {
        const existing = prev[msg.fromId];
        const thread: DmThread = existing ?? {
          userId: msg.fromId,
          userName: msg.fromName,
          userEmoji: msg.fromEmoji,
          userColor: msg.fromColor,
          messages: [],
          unread: 0,
        };
        return {
          ...prev,
          [msg.fromId]: {
            ...thread,
            messages: [...thread.messages, { ...msg, isMine: false }],
            unread: thread.unread + 1,
          },
        };
      });
    });

    socket.on("dashboard:dmEcho", (msg: DmPayload) => {
      if (!msg.toId) return;
      const toId = msg.toId;
      const toName = msg.toName ?? "User";
      setThreads(prev => {
        const existing = prev[toId];
        const thread: DmThread = existing ?? {
          userId: toId,
          userName: toName,
          userEmoji: "🎮",
          userColor: "#f5a524",
          messages: [],
          unread: 0,
        };
        return {
          ...prev,
          [toId]: {
            ...thread,
            messages: [...thread.messages, { ...msg, isMine: true }],
          },
        };
      });
    });

    return () => {
      socket.off("connect", doJoin);
      socket.off("reconnect", doJoin);
      socket.off("dashboard:all");
      socket.off("dashboard:joined");
      socket.off("dashboard:left");
      socket.off("dashboard:dmMsg");
      socket.off("dashboard:dmEcho");
    };
  }, [myName, myEmoji, myLearnerId, updateCount]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread, threads]);

  useEffect(() => {
    if (activeThread && open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [activeThread, open]);

  const openThread = useCallback((user: OnlineUser) => {
    setActiveThread(user.id);
    setThreads(prev => {
      if (!prev[user.id]) {
        return {
          ...prev,
          [user.id]: {
            userId: user.id,
            userName: user.name,
            userEmoji: user.avatarEmoji,
            userColor: user.color,
            messages: [],
            unread: 0,
          },
        };
      }
      return { ...prev, [user.id]: { ...prev[user.id], unread: 0 } };
    });
  }, []);

  const sendDm = useCallback(() => {
    const text = dmInput.trim();
    if (!text || !activeThread || !socketRef.current) return;
    socketRef.current.emit("dashboard:dm", { toId: activeThread, message: text });
    setDmInput("");
    inputRef.current?.focus();
  }, [dmInput, activeThread]);

  const toggleOpen = () => {
    setOpen(v => {
      if (!v && activeThread) {
        setThreads(prev => ({
          ...prev,
          [activeThread]: { ...prev[activeThread], unread: 0 },
        }));
      }
      return !v;
    });
  };

  const others = users.filter(u => u.id !== mySocketId);
  const activeUser = activeThread ? threads[activeThread] : null;
  const activeMessages = activeThread ? (threads[activeThread]?.messages ?? []) : [];
  const isActiveOnline = others.some(u => u.id === activeThread);

  return (
    <>
      {/* ── Floating bubble ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* ── Popup panel ── */}
        {open && (
          <div
            className="flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: 320,
              height: 480,
              background: "rgba(6,14,30,0.98)",
              border: "1px solid rgba(245,165,36,0.25)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(245,165,36,0.06)" }}
            >
              {activeThread ? (
                <button
                  onClick={() => { setActiveThread(null); setDmInput(""); }}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : (
                <Users className="h-4 w-4 text-gold flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                {activeThread ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{activeUser?.userEmoji}</span>
                    <span className="text-sm font-bold text-white truncate">{activeUser?.userName}</span>
                    {isActiveOnline ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                        online
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 flex-shrink-0">offline</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Online Now</span>
                    <span className="text-xs text-slate-400 font-medium">{users.length} {users.length === 1 ? "user" : "users"}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            {!activeThread ? (
              /* ── User list ── */
              <div className="flex-1 overflow-y-auto">
                <div className="px-3 pt-3 pb-1">
                  {/* You */}
                  <div className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-2 px-1">You</div>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-3"
                    style={{ background: "rgba(245,165,36,0.07)", border: "1px solid rgba(245,165,36,0.15)" }}>
                    <span className="text-xl">{myEmoji}</span>
                    <span className="flex-1 text-sm font-bold text-white truncate">{myName || "You"}</span>
                    <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400 flex-shrink-0" />
                  </div>

                  {/* Others online */}
                  <div className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-2 px-1">
                    Others online {others.length > 0 && `(${others.length})`}
                  </div>

                  {others.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <div className="text-3xl mb-3">👋</div>
                      <div className="text-sm font-semibold text-slate-300">No one else here yet</div>
                      <div className="text-xs text-slate-500 mt-1">When friends log in they'll appear here — click their name to chat!</div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {others.map(u => {
                        const thread = threads[u.id];
                        const unread = thread?.unread ?? 0;
                        const lastMsg = thread?.messages[thread.messages.length - 1];
                        return (
                          <button
                            key={u.id}
                            onClick={() => openThread(u)}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-100 text-left relative"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            <span className="text-xl flex-shrink-0">{u.avatarEmoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white truncate">{u.name}</div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {lastMsg
                                  ? (lastMsg.isMine ? `You: ${lastMsg.message}` : lastMsg.message)
                                  : "Tap to send a message →"}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                              {unread > 0 && (
                                <span className="h-5 min-w-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                                  style={{ background: "#ef4444" }}>
                                  {unread}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Offline threads */}
                  {Object.values(threads).filter(t => !others.some(u => u.id === t.userId)).length > 0 && (
                    <>
                      <div className="text-[10px] uppercase tracking-widest text-slate-700 font-bold mb-2 px-1 mt-4">Recent (offline)</div>
                      {Object.values(threads)
                        .filter(t => !others.some(u => u.id === t.userId))
                        .map(t => (
                          <button
                            key={t.userId}
                            onClick={() => { setActiveThread(t.userId); setThreads(prev => ({ ...prev, [t.userId]: { ...prev[t.userId], unread: 0 } })); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left mb-1.5 transition-all"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                          >
                            <span className="text-xl flex-shrink-0 opacity-40">{t.userEmoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-slate-500 truncate">{t.userName}
                                <span className="text-slate-700 font-normal text-xs ml-1">(offline)</span>
                              </div>
                            </div>
                          </button>
                        ))}
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* ── DM thread ── */
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
                  {activeMessages.length === 0 && (
                    <div className="text-center py-12 px-4">
                      <div className="text-4xl mb-3">{activeUser?.userEmoji}</div>
                      <div className="text-sm font-semibold text-slate-300">Say hi to {activeUser?.userName}!</div>
                      <div className="text-xs text-slate-600 mt-1">Messages last for this session only.</div>
                    </div>
                  )}
                  {activeMessages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.isMine ? "justify-end" : "justify-start"}`}>
                      {!m.isMine && (
                        <span className="text-base flex-shrink-0 mt-1">{activeUser?.userEmoji}</span>
                      )}
                      <div
                        className="max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words"
                        style={m.isMine
                          ? { background: "linear-gradient(135deg,#f5a524,#ea580c)", color: "#0a1428", borderBottomRightRadius: 6 }
                          : { background: "rgba(255,255,255,0.08)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)", borderBottomLeftRadius: 6 }}
                      >
                        {m.message}
                      </div>
                    </div>
                  ))}
                </div>

                {!isActiveOnline && (
                  <div className="text-center text-[11px] text-amber-400/60 px-4 py-1 flex-shrink-0">
                    This user has gone offline
                  </div>
                )}

                {/* Input */}
                <div className="flex-shrink-0 px-3 py-3 flex gap-2 items-center"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={dmInput}
                    onChange={e => setDmInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") sendDm(); }}
                    placeholder={isActiveOnline ? `Message ${activeUser?.userName ?? ""}…` : "User is offline"}
                    maxLength={500}
                    disabled={!isActiveOnline}
                    className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                  <button
                    onClick={sendDm}
                    disabled={!dmInput.trim() || !isActiveOnline}
                    className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
                    style={{ background: "linear-gradient(135deg,#f5a524,#ea580c)" }}
                  >
                    <Send className="h-4 w-4 text-white" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── The bubble button ── */}
        <button
          onClick={toggleOpen}
          className="h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 relative"
          style={{
            background: open
              ? "rgba(20,30,60,0.95)"
              : "linear-gradient(135deg,#f5a524,#ea580c)",
            border: open ? "2px solid rgba(245,165,36,0.4)" : "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {open ? (
            <X className="h-5 w-5 text-gold" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white" />
          )}
          {/* Online count badge */}
          {!open && users.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: "#1d4ed8", border: "2px solid #060e1e" }}>
              {users.length}
            </span>
          )}
          {/* Unread DM badge */}
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: "#ef4444", border: "2px solid #060e1e" }}>
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
