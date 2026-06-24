import mongoose, { Schema, Model } from "mongoose";

// Team rooms for DOM Defender for teams (FR-DD-EDU-001). A host opens a room with
// a shared seed; members join via the code, play the identical run, and a live
// board ranks them. Rooms auto-expire 24h after creation (TTL).

export interface RoomMember {
  userId: string;
  username: string;
  score: number;
}

export interface RoomDoc {
  code: string;
  hostUserId: string;
  hostUsername: string;
  seed: number;
  status: "open" | "closed";
  timeBoxMinutes: number;
  members: RoomMember[];
  createdAt: Date;
  closesAt: Date;
}

const MemberSchema = new Schema<RoomMember>(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const RoomSchema = new Schema<RoomDoc>(
  {
    // `unique` already creates the index - do not also set index:true (avoids the
    // duplicate-index warning).
    code: { type: String, required: true, unique: true },
    hostUserId: { type: String, required: true, index: true },
    hostUsername: { type: String, required: true },
    seed: { type: Number, required: true },
    status: { type: String, enum: ["open", "closed"], default: "open", index: true },
    timeBoxMinutes: { type: Number, default: 15 },
    members: { type: [MemberSchema], default: [] },
    closesAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Auto-clean rooms 24 hours after creation.
RoomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

const Room: Model<RoomDoc> =
  (mongoose.models.Room as Model<RoomDoc>) || mongoose.model<RoomDoc>("Room", RoomSchema);

export default Room;
