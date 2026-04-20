import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  email?: string;
  passwordHash: string;
  selectedSkin: string;
  unlockedSkins: string[];
  unlockedAchievements: string[];
  // Non-skin cosmetics (trails, titles, badges, sfx packs). IDs from
  // lib/game/cosmetics.ts.
  ownedCosmetics: string[];
  selectedTitle?: string;
  selectedTrail?: string;
  selectedBadge?: string;
  selectedSfxPack?: string;
  // Pro tier state. Gated by the PRO_BILLING_ENABLED env var — even if isPro
  // is true in the DB, Pro perks only apply when the env flag is on.
  isPro: boolean;
  proTier?: "supporter" | "patron";
  proSince?: Date;
  totalCoins: number;
  totalRuns: number;
  totalBugsFixed: number;
  longestRunSeconds: number;
  highScore: number;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, minlength: 2, maxlength: 24, index: true, trim: true },
    email: { type: String, required: false, unique: false, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    selectedSkin: { type: String, default: "default" },
    unlockedSkins: { type: [String], default: ["default"] },
    unlockedAchievements: { type: [String], default: [] },
    ownedCosmetics: { type: [String], default: [] },
    selectedTitle: { type: String, required: false },
    selectedTrail: { type: String, required: false },
    selectedBadge: { type: String, required: false },
    selectedSfxPack: { type: String, required: false },
    isPro: { type: Boolean, default: false, index: true },
    proTier: { type: String, enum: ["supporter", "patron"], required: false },
    proSince: { type: Date, required: false },
    totalCoins: { type: Number, default: 0 },
    totalRuns: { type: Number, default: 0 },
    totalBugsFixed: { type: Number, default: 0 },
    longestRunSeconds: { type: Number, default: 0 },
    highScore: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default (models.User as mongoose.Model<IUser>) || model<IUser>("User", UserSchema);
