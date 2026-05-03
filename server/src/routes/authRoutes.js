import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (username.length < 3 || password.length < 4) {
      return res.status(400).json({
        message: "Username must be 3+ chars and password 4+ chars.",
      });
    }

    let user = await User.findOne({ username });

    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({ username, passwordHash });
    } else {
      const passwordCorrect = await bcrypt.compare(password, user.passwordHash);

      if (!passwordCorrect) {
        return res.status(401).json({
          message: "Incorrect password.",
        });
      }
    }

    return res.json({
      token: signToken(user),
      user: {
        id: user._id,
        username: user.username,
        matchesPlayed: user.matchesPlayed,
        matchesWon: user.matchesWon,
      },
    });
  } catch (err) {
    console.error("AUTH ERROR:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message:
          "Duplicate database value. Check MongoDB indexes and keep only _id_ and username_1 as unique indexes.",
      });
    }

    return res.status(500).json({
      message: "Login/signup failed.",
    });
  }
});

export default router;
