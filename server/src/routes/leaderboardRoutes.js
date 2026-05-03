import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const users = await User.find({}, "username matchesPlayed matchesWon").lean();
  const rows = users
    .map((u) => ({
      username: u.username,
      matchesPlayed: u.matchesPlayed || 0,
      matchesWon: u.matchesWon || 0,
      winRatio: (u.matchesPlayed || 0) === 0 ? 0 : (u.matchesWon || 0) / u.matchesPlayed
    }))
    .sort((a, b) => b.winRatio - a.winRatio || b.matchesWon - a.matchesWon || b.matchesPlayed - a.matchesPlayed);

  res.json(rows);
});

export default router;
