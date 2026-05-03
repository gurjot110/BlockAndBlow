import jwt from "jsonwebtoken";

export function authSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { userId: payload.userId, username: payload.username };
    next();
  } catch {
    next(new Error("Invalid auth token"));
  }
}
