import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./logger";

type Player = {
  id: string;
  name: string;
  ready: boolean;
  choice: string | null;
  color: string;
};

type Room = {
  code: string;
  slug: string;
  missionId: string | null;
  players: Map<string, Player>;
  votes: Map<string, string>;
  phase: "lobby" | "mission" | "result";
  correctChoiceId: string | null;
};

type CityPresence = {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
  heading: number;
};

type DashboardUser = {
  id: string;
  name: string;
  avatarEmoji: string;
  learnerId: string;
  color: string;
};

const rooms = new Map<string, Room>();
const cityPresence = new Map<string, CityPresence>();
const dashboardPresence = new Map<string, DashboardUser>();

const PLAYER_COLORS = ["#f5a524", "#3b82f6", "#22c55e", "#ec4899", "#f472b6", "#38bdf8", "#a3e635", "#fb923c"];

function makeCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function roomView(room: Room) {
  return {
    code: room.code,
    slug: room.slug,
    missionId: room.missionId,
    phase: room.phase,
    players: Array.from(room.players.values()),
    votes: Object.fromEntries(room.votes),
    correctChoiceId: room.correctChoiceId,
  };
}

function assignColor(existingColors: string[]): string {
  for (const c of PLAYER_COLORS) {
    if (!existingColors.includes(c)) return c;
  }
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

export function attachMultiplayer(server: HttpServer) {
  const io = new SocketIOServer(server, {
    path: "/api/socket.io",
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    logger.info({ id: socket.id }, "socket connected");

    /* ───────────────────────────────────────────
       CAREER CITY PRESENCE
    ─────────────────────────────────────────── */

    socket.on("city:join", ({ name, x, z }: { name: string; x?: number; z?: number }) => {
      const usedColors = [...cityPresence.values()].map(p => p.color);
      const presence: CityPresence = {
        id: socket.id,
        name: name || "Explorer",
        color: assignColor(usedColors),
        x: x ?? 0,
        z: z ?? 0,
        heading: 0,
      };
      cityPresence.set(socket.id, presence);
      void socket.join("city");
      socket.emit("city:all", Array.from(cityPresence.values()));
      socket.to("city").emit("city:joined", presence);
      logger.info({ id: socket.id, name }, "city join");
    });

    socket.on("city:move", ({ x, z, heading }: { x: number; z: number; heading: number }) => {
      const p = cityPresence.get(socket.id);
      if (!p) return;
      p.x = x;
      p.z = z;
      p.heading = heading;
      socket.to("city").emit("city:moved", { id: socket.id, x, z, heading });
    });

    socket.on("city:chat", ({ message }: { message: string }) => {
      const p = cityPresence.get(socket.id);
      if (!p) return;
      io.to("city").emit("city:chatMsg", { id: socket.id, name: p.name, color: p.color, message });
    });

    /* ───────────────────────────────────────────
       DASHBOARD PRESENCE + DIRECT MESSAGES
    ─────────────────────────────────────────── */

    socket.on("dashboard:join", ({ name, avatarEmoji, learnerId }: {
      name: string; avatarEmoji: string; learnerId: string;
    }) => {
      const usedColors = [...dashboardPresence.values()].map(u => u.color);
      const user: DashboardUser = {
        id: socket.id,
        name: name || "Explorer",
        avatarEmoji: avatarEmoji || "🎮",
        learnerId: learnerId || socket.id,
        color: assignColor(usedColors),
      };
      dashboardPresence.set(socket.id, user);
      void socket.join("dashboard");
      socket.emit("dashboard:all", Array.from(dashboardPresence.values()));
      socket.to("dashboard").emit("dashboard:joined", user);
      logger.info({ id: socket.id, name }, "dashboard join");
    });

    socket.on("dashboard:dm", ({ toId, message }: { toId: string; message: string }) => {
      const from = dashboardPresence.get(socket.id);
      if (!from || !message?.trim()) return;
      const to = dashboardPresence.get(toId);
      if (!to) return;
      const ts = Date.now();
      /* send to recipient */
      io.to(toId).emit("dashboard:dmMsg", {
        fromId: socket.id,
        fromName: from.name,
        fromEmoji: from.avatarEmoji,
        fromColor: from.color,
        message: message.trim(),
        ts,
      });
      /* echo back to sender */
      socket.emit("dashboard:dmEcho", {
        fromId: socket.id,
        fromName: from.name,
        fromEmoji: from.avatarEmoji,
        fromColor: from.color,
        toId,
        toName: to.name,
        message: message.trim(),
        ts,
      });
    });

    /* ───────────────────────────────────────────
       SIMULATION ROOMS
    ─────────────────────────────────────────── */

    socket.on("room:create", ({ name, slug }: { name: string; slug: string }, cb) => {
      const code = makeCode();
      const existingColors = [...cityPresence.values()].map(p => p.color);
      const room: Room = {
        code,
        slug,
        missionId: null,
        players: new Map(),
        votes: new Map(),
        phase: "lobby",
        correctChoiceId: null,
      };
      const player: Player = {
        id: socket.id,
        name: name || "Player 1",
        ready: false,
        choice: null,
        color: cityPresence.get(socket.id)?.color ?? assignColor(existingColors),
      };
      room.players.set(socket.id, player);
      rooms.set(code, room);
      void socket.join(code);
      logger.info({ code, slug }, "room created");
      cb?.({ ok: true, room: roomView(room) });
      io.to(code).emit("room:update", roomView(room));
    });

    socket.on("room:join", ({ name, code }: { name: string; code: string }, cb) => {
      const room = rooms.get(code.toUpperCase());
      if (!room) { cb?.({ ok: false, error: "Room not found" }); return; }
      if (room.players.size >= 4) { cb?.({ ok: false, error: "Room is full" }); return; }
      const existingColors = [...room.players.values()].map(p => p.color);
      const player: Player = {
        id: socket.id,
        name: name || `Player ${room.players.size + 1}`,
        ready: false,
        choice: null,
        color: cityPresence.get(socket.id)?.color ?? assignColor(existingColors),
      };
      room.players.set(socket.id, player);
      void socket.join(code.toUpperCase());
      logger.info({ code, name }, "player joined");
      cb?.({ ok: true, room: roomView(room) });
      io.to(code.toUpperCase()).emit("room:update", roomView(room));
    });

    socket.on("room:ready", ({ code }: { code: string }) => {
      const room = rooms.get(code);
      if (!room) return;
      const p = room.players.get(socket.id);
      if (!p) return;
      p.ready = !p.ready;
      io.to(code).emit("room:update", roomView(room));
      const allReady = [...room.players.values()].every(pl => pl.ready) && room.players.size >= 2;
      if (allReady && room.phase === "lobby") {
        room.phase = "mission";
        io.to(code).emit("room:start", { slug: room.slug });
        io.to(code).emit("room:update", roomView(room));
      }
    });

    socket.on("room:mission", ({ code, missionId, mission }: {
      code: string; missionId: string; mission: unknown;
    }) => {
      const room = rooms.get(code);
      if (!room) return;
      room.missionId = missionId;
      room.votes.clear();
      room.phase = "mission";
      room.correctChoiceId = null;
      room.players.forEach(p => { p.choice = null; p.ready = false; });
      io.to(code).emit("room:mission", { mission });
      io.to(code).emit("room:update", roomView(room));
    });

    socket.on("room:vote", ({ code, choiceId }: { code: string; choiceId: string }) => {
      const room = rooms.get(code);
      if (!room) return;
      const p = room.players.get(socket.id);
      if (!p) return;
      p.choice = choiceId;
      room.votes.set(socket.id, choiceId);
      io.to(code).emit("room:update", roomView(room));
      const allVoted = [...room.players.values()].every(pl => pl.choice !== null);
      if (allVoted) {
        io.to(code).emit("room:allVoted", { votes: Object.fromEntries(room.votes) });
      }
    });

    socket.on("room:result", ({ code, result, correctChoiceId }: {
      code: string; result: unknown; correctChoiceId: string;
    }) => {
      const room = rooms.get(code);
      if (!room) return;
      room.phase = "result";
      room.correctChoiceId = correctChoiceId;
      io.to(code).emit("room:result", { result, correctChoiceId });
      io.to(code).emit("room:update", roomView(room));
    });

    socket.on("room:next", ({ code }: { code: string }) => {
      const room = rooms.get(code);
      if (!room) return;
      room.phase = "lobby";
      room.missionId = null;
      room.votes.clear();
      room.correctChoiceId = null;
      room.players.forEach(p => { p.choice = null; p.ready = false; });
      io.to(code).emit("room:update", roomView(room));
    });

    socket.on("disconnect", () => {
      /* city cleanup */
      if (cityPresence.has(socket.id)) {
        cityPresence.delete(socket.id);
        socket.to("city").emit("city:left", { id: socket.id });
      }
      /* dashboard cleanup */
      if (dashboardPresence.has(socket.id)) {
        dashboardPresence.delete(socket.id);
        socket.to("dashboard").emit("dashboard:left", { id: socket.id });
      }
      /* room cleanup */
      rooms.forEach((room, code) => {
        if (room.players.has(socket.id)) {
          room.players.delete(socket.id);
          if (room.players.size === 0) {
            rooms.delete(code);
          } else {
            io.to(code).emit("room:update", roomView(room));
          }
        }
      });
      logger.info({ id: socket.id }, "socket disconnected");
    });
  });

  logger.info("Multiplayer socket.io attached");
}
