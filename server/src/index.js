import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import { authSocket } from "./authSocket.js";
import { registerSocketHandlers } from "./socket/socketHandler.js";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.get("/health", (_req, res) => res.json({ ok: true }));

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use(authSocket);
registerSocketHandlers(io);
console.log("CLIENT_URL:", CLIENT_URL);
connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on ${PORT}`));
});
