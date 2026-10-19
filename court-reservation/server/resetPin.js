require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const { randomPin } = require("./utils/pin");

const run = async () => {
  const email = (process.argv[2] || "").toLowerCase();
  if (!email) {
    console.log("Usage: node resetPin.js <email>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email });
  if (!user || user.role === "user") {
    console.log("No staff or admin account found with that email");
    process.exit(1);
  }

  const tempPin = randomPin();
  user.pin = await bcrypt.hash(tempPin, 10);
  user.mustChangePin = true;
  user.pinAttempts = 0;
  user.pinLockedUntil = null;
  user.pinLockLevel = 0;
  await user.save();

  console.log(`Temporary PIN for ${email}: ${tempPin}`);
  console.log("They must choose a new PIN after logging in.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.log(e.message);
  process.exit(1);
});
