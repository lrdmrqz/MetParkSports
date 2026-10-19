const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true }, // bcrypt hash
    phone: { type: String, default: "" },
    role: { type: String, enum: ["user", "staff", "admin"], default: "user" },

    // Password recovery for customers
    securityQuestion: { type: String, default: "" },
    securityAnswer: { type: String, default: "" }, 

    // PIN for staff and admin 
    pin: { type: String, default: "" },
    pinAttempts: { type: Number, default: 0 },
    pinLockedUntil: { type: Date, default: null },
    pinLockLevel: { type: Number, default: 0 },
    mustChangePin: { type: Boolean, default: false },

    // Archive module
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
