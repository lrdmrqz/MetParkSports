const express = require("express");
const {
  checkEmail,
  registerUser,
  loginUser,
  verifyPin,
  changePin,
  getMe,
  updateProfile,
  changePassword,
  getRecoveryInfo,
  resetPassword,
} = require("../controllers/authController");
const { protect, staffOrAdmin } = require("../middleware/auth");

const router = express.Router();

// Public
router.get("/check-email", checkEmail);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-pin", verifyPin);
router.post("/forgot-password", getRecoveryInfo);
router.post("/reset-password", resetPassword);

// Logged in
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.put("/change-pin", protect, staffOrAdmin, changePin);

module.exports = router;
