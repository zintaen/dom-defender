import mongoose, { Schema, model, models } from "mongoose";

export interface IScore {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;          // denormalized for fast leaderboard reads
  mode: "endless" | "daily" | "tournament";
  dailyKey?: string;         // YYYY-MM-DD for "daily"; ISO week (YYYY-Www) for "tournament"
  seed?: number;             // when set, run was played on a shared private seed
  score: number;
  durationSec: number;
  wave: number;
  bugsFixed: number;
  bossesDefeated: number;
  maxCombo: number;
  skinUsed: string;
  verified: boolean;         // score validated against its replay (NFR-DOM-001)
  createdAt: Date;
}

const ScoreSchema = new Schema<IScore>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    username: { type: String, required: true },
    mode: { type: String, enum: ["endless", "daily", "tournament"], required: true, index: true },
    dailyKey: { type: String, required: false, index: true },
    seed: { type: Number, required: false, index: true },
    score: { type: Number, required: true, index: true },
    durationSec: { type: Number, required: true },
    wave: { type: Number, required: true },
    bugsFixed: { type: Number, required: true, default: 0 },
    bossesDefeated: { type: Number, required: true, default: 0 },
    maxCombo: { type: Number, required: true, default: 0 },
    skinUsed: { type: String, default: "default" },
    verified: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound indexes for leaderboard reads
ScoreSchema.index({ mode: 1, score: -1, createdAt: -1 });
ScoreSchema.index({ mode: 1, dailyKey: 1, score: -1 });
ScoreSchema.index({ seed: 1, score: -1 });
// One user can keep only their best per (mode, dailyKey?), but we store all for history.
// Leaderboard endpoint dedupes per user via aggregation.

export default (models.Score as mongoose.Model<IScore>) || model<IScore>("Score", ScoreSchema);
