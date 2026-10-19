const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sport: { type: String, default: "All" }, 
    pricePerHour: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 }, 
    description: { type: String, default: "" },
    status: { type: String, enum: ["available", "unavailable"], default: "available" },

    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
