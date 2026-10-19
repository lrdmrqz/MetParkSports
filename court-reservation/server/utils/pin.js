
const bcrypt = require("bcryptjs");
const rules = require("../config/rules");

// Check PIN and handle progressive lockouts.
const checkPin = async (user, pin) => {
  const now = new Date();

  if (user.pinLockedUntil && user.pinLockedUntil > now) {
    const minutes = Math.ceil((user.pinLockedUntil - now) / 60000);

    return {
      ok: false,
      message: `Account locked. Try again in ${minutes} minute(s).`,
    };
  }

  const correct = user.pin && (await bcrypt.compare(pin || "", user.pin));

  if (correct) {
    user.pinAttempts = 0;
    user.pinLockedUntil = null;
    user.pinLockLevel = 0;
    await user.save();

    return { ok: true };
  }

  user.pinAttempts = (user.pinAttempts || 0) + 1;

  if (user.pinAttempts >= rules.pinMaxAttempts) {
    const durations = Array.isArray(rules.pinLockMinutes)
      ? rules.pinLockMinutes
      : [1, 5, 15, 30];

    const level = Math.max(0, Number(user.pinLockLevel) || 0);

    const index = Math.min(Math.max(level, 0), durations.length - 1);
    const lockMinutes = Number(durations[index]);

    if (!Number.isFinite(lockMinutes) || lockMinutes <= 0) {
      throw new Error("Invalid PIN lockout duration in server/config/rules.js");
    }

    user.pinAttempts = 0;
    user.pinLockedUntil = new Date(Date.now() + lockMinutes * 60000);
    user.pinLockLevel = Math.min(level + 1, durations.length - 1);

    await user.save();

    return {
      ok: false,
      message: `Too many wrong attempts. Account locked for ${lockMinutes} minute(s).`,
    };
  }

  await user.save();

  return {
    ok: false,
    message: `Wrong PIN. ${rules.pinMaxAttempts - user.pinAttempts} attempt(s) left.`,
  };
};

// Generate a random 6-digit temporary PIN.
const randomPin = () =>
  String(Math.floor(100000 + Math.random() * 900000));

module.exports = { checkPin, randomPin };
