const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { paginate, searchRegex } = require("../utils/paginate");
const { randomPin } = require("../utils/pin");
const { passwordProblems, isEmail, isPhone } = require("../utils/validators");

const hidden = "-password -securityAnswer -pin";

// GET /api/users?group=customers|staff&search=&page=&limit=
const getUsers = async (req, res) => {
  try {
    const filter = { isArchived: { $ne: true } };
    filter.role = req.query.group === "staff" ? { $in: ["staff", "admin"] } : "user";
    if (req.query.search) {
      const rx = searchRegex(req.query.search);
      filter.$or = [{ name: rx }, { email: rx }, { username: rx }];
    }
    res.json(await paginate(User, filter, req, { sort: { createdAt: -1 }, select: hidden }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/users  
const createUser = async (req, res) => {
  try {
    const { name, email, username, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (!isEmail(email)) return res.status(400).json({ message: "Enter a valid email address" });
    if (!isPhone(phone)) return res.status(400).json({ message: "Enter a valid mobile number (09XXXXXXXXX)" });
    const problems = passwordProblems(password);
    if (problems.length > 0) return res.status(400).json({ message: `Password needs ${problems.join(", ")}` });

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ message: "Email is already registered" });
    }
    if (username && (await User.findOne({ username: username.toLowerCase() }))) {
      return res.status(400).json({ message: "Username is already taken" });
    }


    const tempPin = randomPin();

    const user = await User.create({
      name: name.trim(),
      email,
      username: username || undefined,
      phone,
      role: role === "admin" ? "admin" : "staff",
      password: await bcrypt.hash(password, 10),
      pin: await bcrypt.hash(tempPin, 10),
      mustChangePin: true,
    });

    res.status(201).json({ user: await User.findById(user._id).select(hidden), tempPin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/users/:id  
const updateUser = async (req, res) => {
  try {
    const { name, phone, role, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (role && role !== user.role) {
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }
      if (user.role === "user" || !["staff", "admin"].includes(role)) {
        return res.status(400).json({ message: "Only staff and admin roles can be changed" });
      }
      user.role = role;
    }

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: "Name cannot be empty" });
      user.name = name.trim();
    }
    if (phone !== undefined) {
      if (!isPhone(phone)) return res.status(400).json({ message: "Enter a valid mobile number (09XXXXXXXXX)" });
      user.phone = phone;
    }
    if (password) {
      const problems = passwordProblems(password);
      if (problems.length > 0) return res.status(400).json({ message: `Password needs ${problems.join(", ")}` });
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json(await User.findById(user._id).select(hidden));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/users/:id/reset-pin  
const resetPin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "user") return res.status(400).json({ message: "Customers do not use a PIN" });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Ask another admin to reset your PIN" });
    }

    const tempPin = randomPin();
    user.pin = await bcrypt.hash(tempPin, 10);
    user.mustChangePin = true;
    user.pinAttempts = 0;
    user.pinLockedUntil = null;
    await user.save();

    res.json({ message: "PIN reset", tempPin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, createUser, updateUser, resetPin };
