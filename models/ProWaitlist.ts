import mongoose, { Schema, Model } from "mongoose";

export interface ProWaitlistEntry {
  email: string;
  userId?: mongoose.Types.ObjectId;
  username?: string;
  source: string;     // e.g. "pro_page", "shop_upsell"
  note?: string;
  createdAt: Date;
}

const ProWaitlistSchema = new Schema<ProWaitlistEntry>(
  {
    // The unique index is declared once below (schema.index). Do not also set
    // index:true here or Mongoose warns about a duplicate index.
    email: { type: String, required: true, lowercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    username: { type: String },
    source: { type: String, default: "pro_page" },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One email per person is enough — dupes are deduped at insert time.
ProWaitlistSchema.index({ email: 1 }, { unique: true });

const ProWaitlist: Model<ProWaitlistEntry> =
  (mongoose.models.ProWaitlist as Model<ProWaitlistEntry>) ||
  mongoose.model<ProWaitlistEntry>("ProWaitlist", ProWaitlistSchema);

export default ProWaitlist;
