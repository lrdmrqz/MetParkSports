const express = require("express");
const { getEquipment, createEquipment, updateEquipment } = require("../controllers/equipmentController");
const { protect, staffOnly } = require("../middleware/auth");

const router = express.Router();

// Anyone can browse the equipment. Only staff manage it.
router.get("/", getEquipment);
router.post("/", protect, staffOnly, createEquipment);
router.put("/:id", protect, staffOnly, updateEquipment);

module.exports = router;
