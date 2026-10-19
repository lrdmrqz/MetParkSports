export const securityQuestions = [
  "What is the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "In what city were you born?",
  "What is your favorite food?",
];

export const sports = ["Basketball", "Volleyball", "Badminton", "Pickleball"];

export const sportColors = {
  Basketball: "#C2410C",
  Volleyball: "#1E7B55",
  Badminton: "#1B6CB8",
  Pickleball: "#8A6A00",
};

export const getErrorMessage = (error) =>
  error.response?.data?.message || "Something went wrong. Please try again.";

export const formatPeso = (amount) => `₱${Number(amount || 0).toLocaleString("en-PH")}`;

const pad = (n) => String(n).padStart(2, "0");

export const addDaysString = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDate = (dateString) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const formatTime = (time) => {
  const hour = parseInt(time.split(":")[0], 10);
  const minutes = time.split(":")[1];
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minutes} ${hour % 24 >= 12 ? "PM" : "AM"}`;
};

export const hourLabel = (hour) => formatTime(`${pad(hour)}:00`);

export const statusInfo = (r) => {
  if (r.status === "pending" && r.paymentSubmitted) return { label: "Pending verification", bg: "#FFF1D6", color: "#8A4B00" };
  if (r.status === "pending") return { label: "Awaiting payment", bg: "#FDE9E7", color: "#9B2A1B" };
  if (r.status === "confirmed") return { label: "Confirmed", bg: "#DDF5E8", color: "#157347" };
  if (r.status === "completed") return { label: "Completed", bg: "#DCEBFF", color: "#1D4FB8" };
  if (r.status === "cancelled") return { label: "Cancelled", bg: "#FDE3E1", color: "#B42318" };
  return { label: "Expired", bg: "#E5E7EB", color: "#4B5563" };
};

export const paymentLabel = {
  unpaid: "Unpaid",
  downpayment_paid: "Downpayment paid",
  fully_paid: "Fully paid",
  refunded: "Refunded",
};

export const homePath = (role) =>
  role === "admin" ? "/admin/dashboard" : role === "staff" ? "/staff/dashboard" : "/my-reservations";

export const presetRange = (preset) => {
  const to = addDaysString(0);
  if (preset === "last30") return { from: addDaysString(-29), to };
  if (preset === "month") return { from: `${to.slice(0, 8)}01`, to };
  return { from: addDaysString(-6), to };
};
