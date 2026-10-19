const pad = (n) => String(n).padStart(2, "0");

// Convert a Date object to YYYY-MM-DD using local time.
const toDateString = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Get today's date.
const today = () => toDateString(new Date());

// Add or subtract days without changing the date format.
const addDays = (dateString, n) => {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + n);

  return toDateString(date);
};

// Start and end of a day.
const dayStart = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const dayEnd = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
};

// Number of days between two dates
const daysInRange = (from, to) =>
  Math.max(
    Math.round((dayStart(to) - dayStart(from)) / 86400000) + 1,
    1
  );

// Date ranges for the dashboard.
const rangeFor = (period) => {
  const t = today();

  if (period === "yesterday") {
    const yesterday = addDays(t, -1);
    return { from: yesterday, to: yesterday };
  }

  if (period === "last7") {
    return { from: addDays(t, -6), to: t };
  }

  if (period === "month") {
  const year = t.slice(0, 4);
  const month = t.slice(5, 7);
  const lastDay = new Date(Number(year), Number(month), 0).getDate();

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${pad(lastDay)}`,
  };
}

  if (period === "upcoming") {
    return { from: addDays(t, 1), to: "9999-12-31" };
  }

  return { from: t, to: t };
};

module.exports = {
  today,
  addDays,
  dayStart,
  dayEnd,
  daysInRange,
  rangeFor,
};
