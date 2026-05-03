import { GameManager } from "./gameManager.js";

export function registerSocketHandlers(io) {
  const manager = new GameManager(io);

  io.on("connection", (socket) => {
    socket.emit("connected", {
      socketId: socket.id,
      user: socket.user,
    });

    socket.on("joinRoom", ({ roomId }, cb) => {
      try {
        const room = manager.createOrJoin(socket, roomId);

        cb?.({
          ok: true,
          room,
        });
      } catch (err) {
        cb?.({
          ok: false,
          message: err.message,
        });
      }
    });

    socket.on("startMatch", (_payload, cb) => {
      try {
        manager.startMatch(socket);

        cb?.({
          ok: true,
        });
      } catch (err) {
        cb?.({
          ok: false,
          message: err.message,
        });
      }
    });

    socket.on("playerInput", (input) => {
      manager.setInput(socket, input);
    });

    socket.on("leaveRoom", () => {
      manager.leave(socket);
    });

    socket.on("disconnect", () => {
      manager.leave(socket);
    });
  });
}
