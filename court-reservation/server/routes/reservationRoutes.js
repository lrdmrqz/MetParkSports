const express = require("express");
const {
  createReservation,
  submitPayment,
  getMyReservations,
  getAllReservations,
  getAvailability,
  getCalendar,
  cancelReservation,
  verifyPayment,
  rejectPayment,
  collectBalance,
  completeReservation,
} = require("../controllers/reservationController");
const { protect, customerOnly, staffOnly, staffOrAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/my", protect, customerOnly, getMyReservations);
router.get("/availability/:courtId", getAvailability);
router.get("/calendar/:courtId", getCalendar);
router.get("/", protect, staffOrAdmin, getAllReservations); // admin can only view

// Customer
router.post("/", protect, customerOnly, createReservation);
router.put("/:id/pay", protect, customerOnly, submitPayment);
router.put("/:id/cancel", protect, cancelReservation);

// Staff handle the transactions
router.put("/:id/verify-payment", protect, staffOnly, verifyPayment);
router.put("/:id/reject-payment", protect, staffOnly, rejectPayment);
router.put("/:id/collect-balance", protect, staffOnly, collectBalance);
router.put("/:id/complete", protect, staffOnly, completeReservation);

module.exports = router;
