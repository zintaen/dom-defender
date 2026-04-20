import mongoose, { Schema, Model } from "mongoose";

export interface ReplayDoc {
  shortId: string;
  userId?: mongoose.Types.ObjectId;
  username?: string;
  mode: "endless" | "daily";
  seed?: number;
  dailyKey?: string;
  skinId: string;
  durationSec: number;
  score: number;
  wave: number;
  bugsFixed: number;
  bossesDefeated: number;
  maxCombo: number;
  // Stored as arrays of plain objects — we don't need Mongoose sub-schemas here,
  // the API layer validates shape on write.
  events: any[];
  snapshots: any[];
  createdAt: Date;
}

const ReplaySchema = new Schema<ReplayDoc>(
  {
    shortId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    username: { type: String },
    mode: { type: String, enum: ["endless", "daily"], required: true, index: true },
    seed: { type: Number },
    dailyKey: { type: String, index: true },
    skinId: { type: String, default: "default" },
    durationSec: { type: Number, required: true },
    score: { type: Number, required: true },
    wave: { type: Number, required: true },
    bugsFixed: { type: Number, required: true },
    bossesDefeated: { type: Number, required: true },
    maxCombo: { type: Number, required: true },
    events: { type: [{ type: Schema.Types.Mixed }], default: [] },
    snapshots: { type: [{ type: Schema.Types.Mixed }], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Helpful sort for browsing a user's replays.
ReplaySchema.index({ userId: 1, createdAt: -1 });

const Replay: Model<ReplayDoc> =
  (mongoose.models.Replay as Model<ReplayDoc>) ||
  mongoose.model<ReplayDoc>("Replay", ReplaySchema);

export default Replay;
