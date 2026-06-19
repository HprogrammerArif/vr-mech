import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    const base = import.meta.env.BASE_URL ?? "/";
    const origin = window.location.origin;
    socket = io(origin, {
      path: `${base}api/socket.io`.replace(/\/\//g, "/"),
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
