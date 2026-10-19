const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const rules = require("../config/rules");
const { checkPin } = require("../utils/pin");
const { passwordProblems, isEmail, isPhone, isPin } = require("../utils/validators");

const makeToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const makePinToken = (id) => jwt.sign({ id, stage: "pin" }, process.env.JWT_SECRET, { expiresIn: "5m" });


const cleanUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  phone: user.phone,
  role: user.role,
  securityQuestion: user.securityQuestion,
  createdAt: user.createdAt,
});

const normalizeAnswer = (answer) => (answer || "").trim().toLowerCase();

const findByIdentifier = (identifier) => {
  const id = (identifier || "").trim().toLowerCase();
  return User.findOne({ $or: [{ email: id }, { username: id }] });
};

// GET /api/auth/
const checkEmail = async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!isEmail(email)) return res.json({ valid: false, available: false });
    const exists = await User.findOne({ email });
    res.json({ valid: true, available: !exists });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/register  
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, securityQuestion, securityAnswer } = req.body;

    if (!name || !email || !password || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }
    if (!isEmail(email)) return res.status(400).json({ message: "Enter a valid email address" });
    if (!isPhone(phone)) return res.status(400).json({ message: "Enter a valid mobile number (09XXXXXXXXX)" });

    const problems = passwordProblems(password);
    if (problems.length > 0) {
      return res.status(400).json({ message: `Password needs ${problems.join(", ")}` });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email,
      phone,
      password: await bcrypt.hash(password, 10),
      securityQuestion,
      securityAnswer: await bcrypt.hash(normalizeAnswer(securityAnswer), 10),
    });

    res.status(201).json({ user: cleanUser(user), token: makeToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await findByIdentifier(identifier);

    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({ message: "Invalid email/username or password" });
    }
    if (user.isArchived) {
      return res.status(403).json({ message: "Your account is deactivated. Please contact the administrator." });
    }

    if (user.role === "user") {
      return res.json({ user: cleanUser(user), token: makeToken(user._id) });
    }

  
    if (!user.pin) {
      return res.status(403).json({ message: "No PIN is set for this account. Ask an admin to set one." });
    }
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const minutes = Math.ceil((user.pinLockedUntil - new Date()) / 60000);
      return res.status(423).json({ message: `Account locked. Try again in ${minutes} minute(s).` });
    }
    res.json({ pinRequired: true, pinToken: makePinToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/verify-pin   
const verifyPin = async (req, res) => {
  try {
    const { pinToken, pin } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(pinToken || "", process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Your login session expired. Please log in again." });
    }
    if (decoded.stage !== "pin") return res.status(401).json({ message: "Invalid login session" });

    const user = await User.findById(decoded.id);
    if (!user || user.isArchived) return res.status(401).json({ message: "Account not found" });

    const result = await checkPin(user, pin);
    if (!result.ok) return res.status(401).json({ message: result.message });

    res.json({
      user: cleanUser(user),
      token: makeToken(user._id),
      mustChangePin: user.mustChangePin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/auth/change-pin 
const changePin = async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!isPin(newPin)) return res.status(400).json({ message: "The new PIN must be exactly 6 digits" });

    const user = await User.findById(req.user._id);

    if (!user.mustChangePin) {
      const result = await checkPin(user, currentPin);
      if (!result.ok) return res.status(400).json({ message: result.message });
    }

    user.pin = await bcrypt.hash(newPin, 10);
    user.mustChangePin = false;
    await user.save();
    res.json({ message: "PIN changed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
const getMe = (req, res) => {
  res.json({ ...cleanUser(req.user), mustChangePin: req.user.mustChangePin });
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, securityQuestion, securityAnswer } = req.body;
    const user = await User.findById(req.user._id);

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: "Name cannot be empty" });
      user.name = name.trim();
    }
    if (phone !== undefined) {
      if (!isPhone(phone)) return res.status(400).json({ message: "Enter a valid mobile number (09XXXXXXXXX)" });
      user.phone = phone;
    }
    if (user.role === "user" && securityQuestion && securityAnswer) {
      user.securityQuestion = securityQuestion;
      user.securityAnswer = await bcrypt.hash(normalizeAnswer(securityAnswer), 10);
    }

    await user.save();
    res.json(cleanUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await bcrypt.compare(currentPassword || "", user.password))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    const problems = passwordProblems(newPassword);
    if (problems.length > 0) {
      return res.status(400).json({ message: `Password needs ${problems.join(", ")}` });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// POST /api/auth/forgot-password   
const getRecoveryInfo = async (req, res) => {
  try {
    const user = await findByIdentifier(req.body.identifier);
    if (!user || user.isArchived) {
      return res.status(404).json({ message: "No account found" });
    }
    if (user.role === "user") {
      return res.json({ method: "question", securityQuestion: user.securityQuestion });
    }
    res.json({ method: "pin" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/reset-password  
const resetPassword = async (req, res) => {
  try {
    const { identifier, securityAnswer, pin, newPassword } = req.body;

    const problems = passwordProblems(newPassword);
    if (problems.length > 0) {
      return res.status(400).json({ message: `Password needs ${problems.join(", ")}` });
    }

    const user = await findByIdentifier(identifier);
    if (!user || user.isArchived) return res.status(400).json({ message: "Account not found" });

    if (user.role === "user") {
      if (!(await bcrypt.compare(normalizeAnswer(securityAnswer), user.securityAnswer || ""))) {
        return res.status(400).json({ message: "Incorrect answer to the security question" });
      }
    } else {
      const result = await checkPin(user, pin);
      if (!result.ok) return res.status(400).json({ message: result.message });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
  rules,
};
