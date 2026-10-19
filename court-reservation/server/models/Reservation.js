const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    refNo: { type: String, index: true }, // MPS-000001
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    court: { type: mongoose.Schema.Types.ObjectId, ref: "Court", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    players: { type: Number, default: 1, min: 1 },

    equipment: [
      {
        _id: false,
        equipment: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
        name: String,
        pricePerHour: Number,
        quantity: Number,
        fee: Number,
      },
    ],

    // Prices 
    courtFee: { type: Number, required: true },
    equipmentFee: { type: Number, default: 0 },
    doorCharge: { type: Number, required: true },
    totalPrice: { type: Number, required: true },

    // Payment the customer submitted
    paymentOption: { type: String, enum: ["downpayment", "full"], default: "downpayment" },
    paymentMethod: { type: String, default: "" },
    paymentReference: { type: String, default: "" },
    paymentSubmitted: { type: Boolean, default: false }, // true = waiting for staff to verify
    paymentDeclared: { type: Number, default: 0 }, // amount the customer says was paid
    paymentNote: { type: String, default: "" }, // reason when staff reject a payment

    payments: [
      {
        _id: false,
        kind: { type: String, enum: ["downpayment", "full", "balance", "refund"] },
        amount: Number,
        method: String,
        reference: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],
    amountPaid: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "downpayment_paid", "fully_paid", "refunded"],
      default: "unpaid",
    },
    refundAmount: { type: Number, default: 0 },

    expiresAt: { type: Date },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "expired"],
      default: "pending",
    },

    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reservation", reservationSchema);
