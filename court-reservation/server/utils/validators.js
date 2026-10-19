const passwordProblems = (password = "") => {
  const problems = [];
  if (password.length < 8) problems.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) problems.push("1 uppercase letter");
  if (!/[a-z]/.test(password)) problems.push("1 lowercase letter");
  if (!/\d/.test(password)) problems.push("1 number");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("1 special character");
  return problems;
};


const isEmail = (email = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Philippine mobile number: 09 or +63
const isPhone = (phone = "") =>
  !phone || /^(09\d{9}|9\d{9})$/.test(String(phone).trim());


const isPin = (pin = "") => /^\d{6}$/.test(pin);

const isReference = (ref = "") => /^[A-Za-z0-9-]{6,30}$/.test(ref);

module.exports = { passwordProblems, isEmail, isPhone, isPin, isReference };
