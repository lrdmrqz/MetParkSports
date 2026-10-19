const express = require("express");
const { getUsers, createUser, updateUser, resetPin } = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// The admin manages the accounts
router.use(protect, adminOnly);

router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.put("/:id/reset-pin", resetPin);

module.exports = router;
