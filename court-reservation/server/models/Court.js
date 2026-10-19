const mongoose = require("mongoose");

const courtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sport: { type: String, required: true }, 
    location: { type: String, required: true },
    hourlyRate: { type: Number, required: true, min: 0 },
    openTime: { type: String, default: "07:00" }, 
    closeTime: { type: String, default: "24:00" }, 
    description: { type: String, default: "" },
    status: { type: String, enum: ["available", "maintenance"], default: "available" },

    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Court", courtSchema);
