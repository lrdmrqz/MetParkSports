require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const rules = require("./config/rules");
const { expireUnpaid } = require("./controllers/reservationController");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const courtRoutes = require("./routes/courtRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const statsRoutes = require("./routes/statsRoutes");
const archiveRoutes = require("./routes/archiveRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.get("/", (req, res) => res.send("MetParkSports API is running"));
app.get("/api/rules", (req, res) => res.json(rules)); 
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courts", courtRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/archive", archiveRoutes);

//release the reservations that were not paid within 12 hours
setInterval(() => expireUnpaid().catch((e) => console.log("Expire error:", e.message)), 5 * 60 * 1000);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
