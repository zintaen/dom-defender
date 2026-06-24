import mongoose, { Schema, Model } from "mongoose";

// FR-DD-COMM-002 follow edge: follower -> following. The unique compound index
// makes a duplicate follow a no-op at the database level; the API also guards
// against self-follow. Kept deliberately simple so guilds (COMM-003) and
// referrals (SOC-004) can build on the same graph.

export interface FollowDoc {
  follower: mongoose.Types.ObjectId; // the user doing the following
  following: mongoose.Types.ObjectId; // the user being followed
  createdAt: Date;
}

const FollowSchema = new Schema<FollowDoc>(
  {
    follower: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    following: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One edge per (follower, following) pair.
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow: Model<FollowDoc> =
  (mongoose.models.Follow as Model<FollowDoc>) ||
  mongoose.model<FollowDoc>("Follow", FollowSchema);

export default Follow;
