const express = require("express");
const { getCourts, getCourtById, createCourt, updateCourt } = require("../controllers/courtController");
const { protect, staffOnly } = require("../middleware/auth");

const router = express.Router();

// Anyone can browse the courts. Only staff manage them.
router.get("/", getCourts);
router.get("/:id", getCourtById);
router.post("/", protect, staffOnly, createCourt);
router.put("/:id", protect, staffOnly, updateCourt);

module.exports = router;
