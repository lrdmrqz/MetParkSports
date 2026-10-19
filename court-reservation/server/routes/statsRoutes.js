const express = require("express");
const { staffStats, adminStats, transactions, monitoring } = require("../controllers/statsController");
const { protect, staffOnly, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/staff", protect, staffOnly, staffStats); // today / yesterday / last 7 days / month
router.get("/admin", protect, adminOnly, adminStats); // sales and analytics
router.get("/transactions", protect, adminOnly, transactions);
router.get("/monitoring", protect, adminOnly, monitoring);

module.exports = router;
