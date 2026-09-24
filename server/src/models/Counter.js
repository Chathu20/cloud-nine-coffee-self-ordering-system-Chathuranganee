import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

// Atomically increases and returns the next number for a counter
counterSchema.statics.next = async function (name) {
  const counter = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return counter.seq;
};

export default mongoose.model("Counter", counterSchema);