import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    passwordHash: { type: String, required: true },
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 }
  },
  { timestamps: true }
);

userSchema.virtual("winRatio").get(function () {
  return this.matchesPlayed === 0 ? 0 : this.matchesWon / this.matchesPlayed;
});

export default mongoose.model("User", userSchema);
