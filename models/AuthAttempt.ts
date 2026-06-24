import mongoose, { Schema, Model } from "mongoose";

// Durable auth-attempt log for login/registration throttling (NFR-DOM-003).
// On serverless, in-memory limiters do not persist across invocations, so the
// throttle counts rows here over a time window. Rows auto-expire via TTL.

export interface AuthAttemptDoc {
  ipHash: string;
  kind: "login" | "register";
  username?: string;
  createdAt: Date;
}

const AuthAttemptSchema = new Schema<AuthAttemptDoc>(
  {
    ipHash: { type: String, required: true, index: true },
    kind: { type: String, enum: ["login", "register"], required: true, index: true },
    username: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Auto-clean: attempts older than 1 hour are removed by Mongo's TTL monitor.
AuthAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 });
AuthAttemptSchema.index({ ipHash: 1, kind: 1, createdAt: -1 });

const AuthAttempt: Model<AuthAttemptDoc> =
  (mongoose.models.AuthAttempt as Model<AuthAttemptDoc>) ||
  mongoose.model<AuthAttemptDoc>("AuthAttempt", AuthAttemptSchema);

export default AuthAttempt;
