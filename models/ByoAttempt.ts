import mongoose, { Schema, Model } from "mongoose";

// A server-side log of BYO URL load attempts. Used for:
//   - Basic rate limiting (count per ip in a time window)
//   - Surfacing abuse patterns (same domain spammed repeatedly)
//   - Retro-blocking domains we didn't catch with the client-side deny list
//
// We don't PII-fingerprint the user beyond what's already on the session,
// and we TTL these records out after 30 days so the collection stays small.

export interface ByoAttempt {
  ipHash: string;     // short sha-256 of ip (not reversible to an address)
  userId?: mongoose.Types.ObjectId;
  domain: string;     // normalized hostname
  blocked: boolean;   // true if the validator rejected it
  reason?: string;
  createdAt: Date;
}

const ByoAttemptSchema = new Schema<ByoAttempt>(
  {
    ipHash: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    domain: { type: String, required: true, index: true },
    blocked: { type: Boolean, default: false },
    reason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Auto-expire after 30 days.
ByoAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
// Useful for rate-limit counts.
ByoAttemptSchema.index({ ipHash: 1, createdAt: -1 });

const ByoAttempt: Model<ByoAttempt> =
  (mongoose.models.ByoAttempt as Model<ByoAttempt>) ||
  mongoose.model<ByoAttempt>("ByoAttempt", ByoAttemptSchema);

export default ByoAttempt;
