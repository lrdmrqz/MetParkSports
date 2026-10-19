# MetParkSports - Court Reservation System (MERN)

Target client (sample): MET Park Sports Center, Pasay City.
Stack: MongoDB, Express, React, Node.js.

## Folders
```
court-reservation/
  server/   backend (Express + Mongoose)
  client/   frontend (React, created with create-react-app)
```

## Run
1. Start MongoDB (the service must be running).
2. Backend:   cd server  ->  npm install  ->  node seed.js  ->  npx nodemon server.js
3. Frontend:  cd client  ->  npm install react@18 react-dom@18 axios react-router-dom@6 antd@5  ->  npm start

`node seed.js` DELETES all data and inserts the clean demo data (run it again before the presentation).

## Demo accounts (all use the password  Password@123)
| Role | Email | Username |
|---|---|---|
| Admin | roberto.villanueva@yopmail.com | roberto.admin |
| Admin | angelica.reyes@yopmail.com | angelica.admin |
| Staff | liza.santos@yopmail.com | liza.staff |
| Staff | carlo.mendoza@yopmail.com | carlo.staff |
| Staff | jasmine.aquino@yopmail.com | jasmine.staff |
| Customer | juan.delacruz@yopmail.com | |

Staff and admin PIN: 123456.  Customer security answer: bantay.
(Other customers: ana.santos, mark.reyes, princess.delacruz, kristine.bautista, paolo.fernandez, bea.gonzales, miguel.torres @yopmail.com)

## Roles
- Customer: browse courts and equipment, book with the color calendar, pay a 50% downpayment, cancel (refund if 3+ days before).
- Staff: verify payments, confirm, collect the balance, complete, cancel, manage courts and equipment, archive. Sees sales by period (today, yesterday, last 7 days, this month).
- Admin: monitors only. Sales and analytics, reports, court monitoring, accounts (add staff, reset PIN, archive users).

## Rules (server/config/rules.js)
50% downpayment, unpaid reservations expire after 12 hours, refund if cancelled 3+ days before,
reserve 2+ days ahead, PHP 50 door charge per head, open 7:00 AM - 12:00 midnight,
PIN locks for 15 minutes after 5 wrong attempts.

## If the only admin forgets the PIN
cd server  ->  node resetPin.js admin-email@yopmail.com


# Full source code (file by file)


## 1. `server/.env`

```
PORT=8000
MONGO_URI=mongodb://127.0.0.1:27017/court_reservation_db
JWT_SECRET=change_this_to_any_long_random_text
```

## 2. `server/package.json`

```json
{
  "name": "court-reservation-server",
  "version": "1.0.0",
  "description": "Backend for Court Reservation Management System",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node seed.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.5.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
```

## 3. `server/resetPin.js`

```javascript
// Use this when the ONLY admin forgot the PIN (another admin cannot reset it):
//   node resetPin.js admin-email@yopmail.com
// It sets a temporary PIN that must be changed at the next login.
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
```

## 4. `server/seed.js`

```javascript
// Run:  node seed.js
// WARNING: this DELETES everything in users, courts, equipment and reservations,
// then inserts the clean demonstration data:
//   - MET Park Sports Center courts and equipment (target client)
//   - 13 accounts: 2 admins, 3 staff, 8 customers (yopmail emails)
//   - 20 completed reservations with payments
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Court = require("./models/Court");
const Equipment = require("./models/Equipment");
const Reservation = require("./models/Reservation");
const rules = require("./config/rules");

const LOCATION = "MET Park Sports Center, Metrobank Ave., Met Park, Pasay City";

// ---------- COURTS ----------
// Rates follow metpark.ph/sports-center. The NUMBER of courts per sport is a project assumption.
const courts = [
  { name: "Basketball Court", sport: "Basketball", hourlyRate: 1800, description: "FIBA regulation indoor basketball court" },
  { name: "Volleyball Court", sport: "Volleyball", hourlyRate: 1800, description: "Indoor volleyball court" },
  { name: "Badminton Court 1", sport: "Badminton", hourlyRate: 600, description: "Indoor badminton court" },
  { name: "Badminton Court 2", sport: "Badminton", hourlyRate: 600, description: "Indoor badminton court" },
  { name: "Badminton Court 3", sport: "Badminton", hourlyRate: 600, description: "Indoor badminton court" },
  { name: "Badminton Court 4", sport: "Badminton", hourlyRate: 600, description: "Indoor badminton court" },
  { name: "Badminton Court 5", sport: "Badminton", hourlyRate: 600, description: "Indoor badminton court" },
  { name: "Pickleball Court 1", sport: "Pickleball", hourlyRate: 600, description: "Convertible badminton/pickleball court" },
  { name: "Pickleball Court 2", sport: "Pickleball", hourlyRate: 600, description: "Convertible badminton/pickleball court" },
];

// ---------- EQUIPMENT (sample prices and stock) ----------
const equipment = [
  { name: "Badminton Racket Set", sport: "Badminton", pricePerHour: 100, stock: 8, description: "2 rackets and 1 shuttlecock" },
  { name: "Shuttlecock Tube", sport: "Badminton", pricePerHour: 50, stock: 12, description: "12 shuttlecocks" },
  { name: "Basketball", sport: "Basketball", pricePerHour: 50, stock: 6, description: "Size 7 indoor ball" },
  { name: "Volleyball", sport: "Volleyball", pricePerHour: 50, stock: 6, description: "Indoor volleyball" },
  { name: "Pickleball Paddle Set", sport: "Pickleball", pricePerHour: 100, stock: 8, description: "2 paddles and 1 ball" },
  { name: "Court Shoes Rental", sport: "All", pricePerHour: 50, stock: 10, description: "Non-marking court shoes" },
];

// ---------- USERS ----------
// Password for everyone: Password@123
// PIN for staff and admin: 123456
// Security answer for customers: bantay
const SECURITY_QUESTION = "What is the name of your first pet?";
const staffAccounts = [
  { name: "Roberto Villanueva", email: "roberto.villanueva@yopmail.com", username: "roberto.admin", phone: "09171234501", role: "admin" },
  { name: "Angelica Reyes", email: "angelica.reyes@yopmail.com", username: "angelica.admin", phone: "09171234502", role: "admin" },
  { name: "Liza Santos", email: "liza.santos@yopmail.com", username: "liza.staff", phone: "09171234503", role: "staff" },
  { name: "Carlo Mendoza", email: "carlo.mendoza@yopmail.com", username: "carlo.staff", phone: "09171234504", role: "staff" },
  { name: "Jasmine Aquino", email: "jasmine.aquino@yopmail.com", username: "jasmine.staff", phone: "09171234505", role: "staff" },
];
const customerAccounts = [
  { name: "Juan Dela Cruz", email: "juan.delacruz@yopmail.com", phone: "09171234506" },
  { name: "Ana Santos", email: "ana.santos@yopmail.com", phone: "09171234507" },
  { name: "Mark Reyes", email: "mark.reyes@yopmail.com", phone: "09171234508" },
  { name: "Princess Dela Cruz", email: "princess.delacruz@yopmail.com", phone: "09171234509" },
  { name: "Kristine Bautista", email: "kristine.bautista@yopmail.com", phone: "09171234510" },
  { name: "Paolo Fernandez", email: "paolo.fernandez@yopmail.com", phone: "09171234511" },
  { name: "Bea Gonzales", email: "bea.gonzales@yopmail.com", phone: "09171234512" },
  { name: "Miguel Torres", email: "miguel.torres@yopmail.com", phone: "09171234513" },
];

// ---------- 20 COMPLETED RESERVATIONS ----------
// customer = position in the customer list (0 = Juan). eq = [equipment name, quantity].
// "full" = paid everything online. Otherwise 50% online + the balance at the venue.
const transactions = [
  { daysAgo: 28, court: "Basketball Court", start: "18:00", end: "20:00", customer: 0, players: 12, eq: [["Basketball", 1]], method: "GCash" },
  { daysAgo: 27, court: "Badminton Court 1", start: "19:00", end: "21:00", customer: 1, players: 4, eq: [["Badminton Racket Set", 2]], method: "Maya" },
  { daysAgo: 26, court: "Pickleball Court 1", start: "17:00", end: "18:00", customer: 2, players: 4, eq: [["Pickleball Paddle Set", 2]], method: "GCash", full: true },
  { daysAgo: 25, court: "Volleyball Court", start: "19:00", end: "21:00", customer: 3, players: 14, eq: [["Volleyball", 1]], method: "Bank transfer" },
  { daysAgo: 24, court: "Badminton Court 2", start: "20:00", end: "22:00", customer: 4, players: 4, eq: [["Shuttlecock Tube", 1]], method: "GCash" },
  { daysAgo: 23, court: "Basketball Court", start: "20:00", end: "22:00", customer: 5, players: 10, eq: [], method: "Maya" },
  { daysAgo: 21, court: "Badminton Court 3", start: "18:00", end: "19:00", customer: 6, players: 2, eq: [["Badminton Racket Set", 1], ["Court Shoes Rental", 2]], method: "GCash", full: true },
  { daysAgo: 20, court: "Pickleball Court 2", start: "16:00", end: "18:00", customer: 7, players: 4, eq: [["Pickleball Paddle Set", 1]], method: "GCash" },
  { daysAgo: 19, court: "Badminton Court 1", start: "18:00", end: "20:00", customer: 0, players: 4, eq: [], method: "Maya" },
  { daysAgo: 17, court: "Basketball Court", start: "19:00", end: "21:00", customer: 2, players: 11, eq: [["Basketball", 2]], method: "GCash" },
  { daysAgo: 16, court: "Volleyball Court", start: "18:00", end: "20:00", customer: 4, players: 12, eq: [], method: "Bank transfer", full: true },
  { daysAgo: 14, court: "Badminton Court 4", start: "19:00", end: "21:00", customer: 1, players: 4, eq: [["Badminton Racket Set", 2], ["Shuttlecock Tube", 1]], method: "GCash" },
  { daysAgo: 13, court: "Pickleball Court 1", start: "20:00", end: "22:00", customer: 3, players: 4, eq: [], method: "Maya" },
  { daysAgo: 12, court: "Badminton Court 5", start: "17:00", end: "18:00", customer: 5, players: 2, eq: [["Court Shoes Rental", 2]], method: "GCash" },
  { daysAgo: 10, court: "Basketball Court", start: "17:00", end: "19:00", customer: 7, players: 10, eq: [["Basketball", 1]], method: "GCash", full: true },
  { daysAgo: 9, court: "Badminton Court 2", start: "21:00", end: "23:00", customer: 6, players: 4, eq: [], method: "Maya" },
  { daysAgo: 7, court: "Pickleball Court 2", start: "19:00", end: "21:00", customer: 0, players: 4, eq: [["Pickleball Paddle Set", 2]], method: "GCash" },
  { daysAgo: 6, court: "Volleyball Court", start: "20:00", end: "22:00", customer: 1, players: 13, eq: [["Volleyball", 1]], method: "Bank transfer" },
  { daysAgo: 4, court: "Badminton Court 3", start: "19:00", end: "21:00", customer: 3, players: 4, eq: [["Badminton Racket Set", 1]], method: "GCash", full: true },
  { daysAgo: 3, court: "Basketball Court", start: "21:00", end: "23:00", customer: 5, players: 12, eq: [], method: "Maya" },
];

const pad = (n) => String(n).padStart(2, "0");
const dateDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // 1. Clean the database
  await Reservation.deleteMany({});
  await Equipment.deleteMany({});
  await Court.deleteMany({});
  await User.deleteMany({});
  console.log("Old data removed");

  // 2. Courts and equipment
  const createdCourts = await Court.insertMany(courts.map((c) => ({ ...c, location: LOCATION })));
  const courtByName = {};
  createdCourts.forEach((c) => (courtByName[c.name] = c));
  const createdEquipment = await Equipment.insertMany(equipment);
  const equipmentByName = {};
  createdEquipment.forEach((e) => (equipmentByName[e.name] = e));
  console.log(`${createdCourts.length} courts and ${createdEquipment.length} equipment items created`);

  // 3. Users
  const passwordHash = await bcrypt.hash("Password@123", 10);
  const pinHash = await bcrypt.hash("123456", 10);
  const answerHash = await bcrypt.hash("bantay", 10);

  const staff = [];
  for (const a of staffAccounts) {
    staff.push(await User.create({ ...a, password: passwordHash, pin: pinHash }));
  }
  const customers = [];
  for (const c of customerAccounts) {
    customers.push(
      await User.create({ ...c, role: "user", password: passwordHash, securityQuestion: SECURITY_QUESTION, securityAnswer: answerHash })
    );
  }
  const verifier = staff.find((s) => s.role === "staff"); // staff who verified the payments
  console.log(`${staff.length + customers.length} users created`);

  // 4. Completed reservations with their payments
  let number = 1;
  for (const t of transactions) {
    const court = courtByName[t.court];
    const hours = parseInt(t.end) - parseInt(t.start);
    const date = dateDaysAgo(t.daysAgo);

    const items = t.eq.map(([name, quantity]) => {
      const item = equipmentByName[name];
      return { equipment: item._id, name, pricePerHour: item.pricePerHour, quantity, fee: item.pricePerHour * hours * quantity };
    });
    const courtFee = hours * court.hourlyRate;
    const equipmentFee = items.reduce((s, i) => s + i.fee, 0);
    const doorCharge = t.players * rules.doorChargePerHead;
    const total = courtFee + equipmentFee + doorCharge;

    const reference = `${t.method.slice(0, 2).toUpperCase()}${String(100000000 + number * 7919)}`;
    const paidOnline = t.full ? total : Math.ceil((total * rules.downpaymentPercent) / 100);
    const onlineAt = new Date(`${date}T10:00:00`);
    onlineAt.setDate(onlineAt.getDate() - 3); // paid 3 days before the game
    const payments = [
      { kind: t.full ? "full" : "downpayment", amount: paidOnline, method: t.method, reference, by: verifier._id, at: onlineAt },
    ];
    if (!t.full) {
      payments.push({ kind: "balance", amount: total - paidOnline, method: "Cash / counter", by: verifier._id, at: new Date(`${date}T${t.start}:00`) });
    }

    await Reservation.create({
      refNo: `MPS-${String(number).padStart(6, "0")}`,
      user: customers[t.customer]._id,
      court: court._id,
      date,
      startTime: t.start,
      endTime: t.end,
      players: t.players,
      equipment: items,
      courtFee,
      equipmentFee,
      doorCharge,
      totalPrice: total,
      paymentOption: t.full ? "full" : "downpayment",
      paymentMethod: t.method,
      paymentReference: reference,
      paymentSubmitted: true,
      paymentDeclared: paidOnline,
      payments,
      amountPaid: total,
      paymentStatus: "fully_paid",
      expiresAt: onlineAt,
      status: "completed",
    });
    number += 1;
  }
  console.log(`${transactions.length} completed reservations created`);

  console.log("\nDone! Password for every account: Password@123");
  console.log("Staff and admin PIN: 123456   |   Customer security answer: bantay");
  console.log("Admin    : roberto.villanueva@yopmail.com  (username roberto.admin)");
  console.log("Staff    : liza.santos@yopmail.com         (username liza.staff)");
  console.log("Customer : juan.delacruz@yopmail.com");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((e) => {
  console.log(e.message);
  process.exit(1);
});
```

## 5. `server/server.js`

```javascript
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
app.use(express.json()); // read JSON sent in request body
app.use(express.urlencoded({ extended: true })); // read form submissions

// Connect to MongoDB
connectDB();

// Routes
app.get("/", (req, res) => res.send("MetParkSports API is running"));
app.get("/api/rules", (req, res) => res.json(rules)); // business rules for the React app
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courts", courtRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/archive", archiveRoutes);

// Every 5 minutes: release the reservations that were not paid within 12 hours
setInterval(() => expireUnpaid().catch((e) => console.log("Expire error:", e.message)), 5 * 60 * 1000);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## 6. `server/config/db.js`

```javascript
const mongoose = require("mongoose");

// Connect to MongoDB using the connection string in .env
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.log("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

## 7. `server/config/rules.js`

```javascript
// Business rules based on the target client: MET Park Sports Center (Pasay City)
// and on the revisions of the professor.
module.exports = {
  advanceBookingDays: 2, // reservations must be made at least 2 days in advance
  doorChargePerHead: 50, // PHP 50 per head, whether player or non-player
  openTime: "07:00", // facility opens 7:00 AM
  closeTime: "24:00", // facility closes 12:00 midnight

  downpaymentPercent: 50, // customers pay at least 50% to reserve
  unpaidExpiryHours: 12, // a reservation without a payment is released after 12 hours
  refundDaysBefore: 3, // downpayment is refunded if cancelled at least 3 days before

  pinMaxAttempts: 5, // wrong PIN attempts before the account is locked
  pinLockMinutes: 15, // how long the account stays locked

  paymentMethods: ["GCash", "Maya", "Bank transfer", "Pay at the counter"],
};
```

## 8. `server/controllers/archiveController.js`

```javascript
const Reservation = require("../models/Reservation");
const Court = require("../models/Court");
const Equipment = require("../models/Equipment");
const User = require("../models/User");

// One controller handles the archive of reservations, courts, equipment and users
const models = {
  reservations: Reservation,
  courts: Court,
  equipment: Equipment,
  users: User,
};

// Who may do what:
//   reservations, courts, equipment -> staff manage them, admin can only view
//   users                           -> admin manages them
const canView = (type, role) =>
  type === "users" ? role === "admin" : ["staff", "admin"].includes(role);
const canManage = (type, role) => (type === "users" ? role === "admin" : role === "staff");

const ACTIVE = ["pending", "confirmed"];

// Returns an error message if the record may NOT be archived, otherwise null
const archiveProblem = async (type, record, req) => {
  if (type === "reservations") {
    if (!["completed", "cancelled", "expired"].includes(record.status)) {
      return "Only completed, cancelled or expired reservations can be archived";
    }
  }
  if (type === "courts") {
    const active = await Reservation.countDocuments({ court: record._id, status: { $in: ACTIVE } });
    if (active > 0) return "This court still has active reservations";
  }
  if (type === "equipment") {
    const active = await Reservation.countDocuments({ "equipment.equipment": record._id, status: { $in: ACTIVE } });
    if (active > 0) return "This equipment is part of active reservations";
  }
  if (type === "users") {
    if (record._id.toString() === req.user._id.toString()) return "You cannot archive your own account";
    const active = await Reservation.countDocuments({ user: record._id, status: { $in: ACTIVE } });
    if (active > 0) return "This user still has active reservations";
  }
  return null;
};

// Checks the type in the address and the role of the user
const prepare = (req, res, manage) => {
  const { type } = req.params;
  const Model = models[type];
  if (!Model) {
    res.status(404).json({ message: "Unknown archive type" });
    return null;
  }
  const allowed = manage ? canManage(type, req.user.role) : canView(type, req.user.role);
  if (!allowed) {
    res.status(403).json({ message: "Your role cannot do this" });
    return null;
  }
  return Model;
};

// GET /api/archive/:type?page=&limit=   -> archived records, paginated
const getArchived = async (req, res) => {
  try {
    const Model = prepare(req, res, false);
    if (!Model) return;
    const { type } = req.params;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const filter = { isArchived: true };

    let query = Model.find(filter).sort({ archivedAt: -1 }).skip((page - 1) * limit).limit(limit);
    if (type === "reservations") query = query.populate("user", "name email").populate("court", "name sport");
    if (type === "users") query = query.select("-password -securityAnswer -pin");

    const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
    res.json({ items, total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/archive/:type/:id/archive
const archiveRecord = async (req, res) => {
  try {
    const Model = prepare(req, res, true);
    if (!Model) return;
    const record = await Model.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (record.isArchived) return res.status(400).json({ message: "Already archived" });

    const problem = await archiveProblem(req.params.type, record, req);
    if (problem) return res.status(400).json({ message: problem });

    record.isArchived = true;
    record.archivedAt = new Date();
    await record.save();
    res.json({ message: "Record archived" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/archive/:type/:id/restore
const restoreRecord = async (req, res) => {
  try {
    const Model = prepare(req, res, true);
    if (!Model) return;
    const record = await Model.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (!record.isArchived) return res.status(400).json({ message: "Record is not archived" });

    record.isArchived = false;
    record.archivedAt = null;
    await record.save();
    res.json({ message: "Record restored" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/archive/:type/:id   -> permanent delete (archived records only)
const deletePermanently = async (req, res) => {
  try {
    const Model = prepare(req, res, true);
    if (!Model) return;
    const { type, id } = req.params;
    const record = await Model.findById(id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (!record.isArchived) {
      return res.status(400).json({ message: "Archive the record first before deleting it" });
    }

    // Keep the history: records that appear in reservations are not deleted
    const usedBy = { courts: { court: id }, users: { user: id }, equipment: { "equipment.equipment": id } }[type];
    if (usedBy && (await Reservation.countDocuments(usedBy)) > 0) {
      return res.status(400).json({
        message: "Cannot delete: reservation records still use it. Keep it archived instead.",
      });
    }

    await Model.findByIdAndDelete(id);
    res.json({ message: "Record deleted permanently" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getArchived, archiveRecord, restoreRecord, deletePermanently };
```

## 9. `server/controllers/authController.js`

```javascript
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const rules = require("../config/rules");
const { checkPin } = require("../utils/pin");
const { passwordProblems, isEmail, isPhone, isPin } = require("../utils/validators");

const makeToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
// Short token (5 minutes) that is only good for the PIN step
const makePinToken = (id) => jwt.sign({ id, stage: "pin" }, process.env.JWT_SECRET, { expiresIn: "5m" });

// What we send to the browser (never passwords, answers or PINs)
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

// Customers sign in with email; staff and admin can also use their username
const findByIdentifier = (identifier) => {
  const id = (identifier || "").trim().toLowerCase();
  return User.findOne({ $or: [{ email: id }, { username: id }] });
};

// GET /api/auth/check-email?email=...   (live "email already taken" check)
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

// POST /api/auth/register   (customers only)
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
      // role is always "user" here. Staff and admin accounts are created by an admin.
    });

    res.status(201).json({ user: cleanUser(user), token: makeToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
// Customers get their token right away. Staff and admin must also enter their PIN.
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

    // Staff and admin: step 2 is the PIN
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

// POST /api/auth/verify-pin   (step 2 of the staff/admin login)
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

// PUT /api/auth/change-pin   (staff and admin)
const changePin = async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!isPin(newPin)) return res.status(400).json({ message: "The new PIN must be exactly 6 digits" });

    const user = await User.findById(req.user._id);

    // After an admin reset, the temporary PIN was just verified, so no current PIN is needed
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

// ---------- PASSWORD RECOVERY ----------
// Customers answer their security question. Staff and admin use their PIN.

// POST /api/auth/forgot-password   Step 1: which method does this account use?
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

// POST /api/auth/reset-password   Step 2: answer or PIN, plus the new password
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
```

## 10. `server/controllers/courtController.js`

```javascript
const Court = require("../models/Court");
const { paginate, searchRegex } = require("../utils/paginate");

// Remove fields that the browser must never be able to change
const cleanBody = (body) => {
  const { _id, __v, createdAt, updatedAt, isArchived, archivedAt, ...data } = body;
  return data;
};

// GET /api/courts   (public)
// With ?page=1 the answer is paginated: { items, total, page, pages }. Without it, a plain list.
const getCourts = async (req, res) => {
  try {
    const filter = { isArchived: { $ne: true } };
    if (req.query.sport) filter.sport = req.query.sport;
    if (req.query.search) filter.name = searchRegex(req.query.search);

    if (req.query.page) {
      return res.json(await paginate(Court, filter, req, { sort: { sport: 1, name: 1 } }));
    }
    res.json(await Court.find(filter).sort({ sport: 1, name: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/courts/:id   (public)
const getCourtById = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court || court.isArchived) return res.status(404).json({ message: "Court not found" });
    res.json(court);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/courts   (staff)
const createCourt = async (req, res) => {
  try {
    res.status(201).json(await Court.create(cleanBody(req.body)));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/courts/:id   (staff)
const updateCourt = async (req, res) => {
  try {
    const court = await Court.findByIdAndUpdate(req.params.id, cleanBody(req.body), {
      new: true,
      runValidators: true,
    });
    if (!court) return res.status(404).json({ message: "Court not found" });
    res.json(court);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getCourts, getCourtById, createCourt, updateCourt };
```

## 11. `server/controllers/equipmentController.js`

```javascript
const Equipment = require("../models/Equipment");
const { paginate, searchRegex } = require("../utils/paginate");

const cleanBody = (body) => {
  const { _id, __v, createdAt, updatedAt, isArchived, archivedAt, ...data } = body;
  return data;
};

// GET /api/equipment   (public). With ?page=1 the answer is paginated.
const getEquipment = async (req, res) => {
  try {
    const filter = { isArchived: { $ne: true } };
    if (req.query.sport) filter.sport = { $in: [req.query.sport, "All"] };
    if (req.query.search) filter.name = searchRegex(req.query.search);

    if (req.query.page) {
      return res.json(await paginate(Equipment, filter, req, { sort: { sport: 1, name: 1 } }));
    }
    res.json(await Equipment.find(filter).sort({ sport: 1, name: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/equipment   (staff)
const createEquipment = async (req, res) => {
  try {
    res.status(201).json(await Equipment.create(cleanBody(req.body)));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/equipment/:id   (staff)
const updateEquipment = async (req, res) => {
  try {
    const item = await Equipment.findByIdAndUpdate(req.params.id, cleanBody(req.body), {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ message: "Equipment not found" });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getEquipment, createEquipment, updateEquipment };
```

## 12. `server/controllers/reservationController.js`

```javascript
const Reservation = require("../models/Reservation");
const Court = require("../models/Court");
const Equipment = require("../models/Equipment");
const User = require("../models/User");
const rules = require("../config/rules");
const { paginate, searchRegex } = require("../utils/paginate");
const { isReference } = require("../utils/validators");
const { today, addDays, dayStart } = require("../utils/dates");

// "14:30" -> 870 (minutes). Used to compare times safely.
const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const ACTIVE = ["pending", "confirmed"]; // statuses that hold the time slot

// ---------- Unpaid reservations expire after 12 hours ----------
// A reservation with no payment submitted is released once its time is over.
const expireUnpaid = async () => {
  await Reservation.updateMany(
    { status: "pending", paymentSubmitted: false, expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } }
  );
};

// MPS-000001, MPS-000002 ...
const nextRefNo = async () => {
  const count = await Reservation.countDocuments();
  return `MPS-${String(count + 1).padStart(6, "0")}`;
};

// ---------- Payment checks shared by "create" and "pay" ----------
// Returns { error } or { method, reference, submitted }
const readPayment = (body) => {
  const method = body.paymentMethod;
  if (!rules.paymentMethods.includes(method)) {
    return { error: "Choose a payment method" };
  }
  if (method === "Pay at the counter") {
    // No reference: the customer must pay at the counter before the reservation expires
    return { method, reference: "", submitted: false };
  }
  const reference = (body.paymentReference || "").trim();
  if (!isReference(reference)) {
    return { error: "Enter a valid reference number (6-30 letters, numbers or dashes)" };
  }
  return { method, reference, submitted: true };
};

// Amount the customer pays now: 50% (rounded up) or the full price
const amountDue = (total, option) =>
  option === "full" ? total : Math.ceil((total * rules.downpaymentPercent) / 100);

// ---------- Filters for the lists ----------
const buildFilter = async (req, base = {}) => {
  const { status, sport, date, search } = req.query;
  const filter = { isArchived: { $ne: true }, ...base };

  if (status) filter.status = status;
  if (date) filter.date = date;
  if (sport) {
    const courts = await Court.find({ sport }).select("_id");
    filter.court = { $in: courts.map((c) => c._id) };
  }
  if (search) {
    const rx = searchRegex(search);
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select("_id");
    filter.$or = [{ refNo: rx }, { paymentReference: rx }, { user: { $in: users.map((u) => u._id) } }];
  }
  return filter;
};

const listOptions = {
  sort: { date: -1, startTime: 1 },
  populate: [
    ["user", "name email phone"],
    ["court", "name sport"],
  ],
};

// POST /api/reservations   (customer)
const createReservation = async (req, res) => {
  try {
    await expireUnpaid();
    const { courtId, date, startTime, endTime, notes } = req.body;
    const players = parseInt(req.body.players, 10);
    const option = req.body.paymentOption === "full" ? "full" : "downpayment";

    if (!courtId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Court, date, start and end time are required" });
    }
    if (!players || players < 1 || players > 100) {
      return res.status(400).json({ message: "Number of people must be between 1 and 100" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(`${date}T00:00:00`))) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const payment = readPayment(req.body);
    if (payment.error) return res.status(400).json({ message: payment.error });

    const court = await Court.findById(courtId);
    if (!court || court.isArchived) return res.status(404).json({ message: "Court not found" });
    if (court.status !== "available") {
      return res.status(400).json({ message: "This court is under maintenance" });
    }

    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (end <= start) {
      return res.status(400).json({ message: "End time must be later than start time" });
    }
    if (start < toMinutes(court.openTime) || end > toMinutes(court.closeTime)) {
      return res.status(400).json({ message: `Court is open from ${court.openTime} to ${court.closeTime}` });
    }
    if (date < addDays(today(), rules.advanceBookingDays)) {
      return res.status(400).json({
        message: `Reservations must be made at least ${rules.advanceBookingDays} days in advance`,
      });
    }

    // Overlap check: an active booking overlaps when its start is before our end
    // AND its end is after our start.
    const overlapFilter = {
      date,
      status: { $in: ACTIVE },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    };
    const conflict = await Reservation.findOne({ ...overlapFilter, court: courtId });
    if (conflict) {
      return res.status(409).json({
        message: `Time slot already booked (${conflict.startTime} - ${conflict.endTime})`,
      });
    }

    // ---------- Equipment ----------
    const hours = (end - start) / 60;
    const items = [];
    const wanted = Array.isArray(req.body.equipment) ? req.body.equipment : [];

    if (wanted.length > 0) {
      // How many pieces are already rented at the same time?
      const overlapping = await Reservation.find(overlapFilter).select("equipment");
      const used = {};
      overlapping.forEach((r) =>
        r.equipment.forEach((e) => {
          used[e.equipment] = (used[e.equipment] || 0) + e.quantity;
        })
      );

      for (const line of wanted) {
        const quantity = parseInt(line.quantity, 10);
        const item = await Equipment.findById(line.equipmentId);
        if (!item || item.isArchived || item.status !== "available" || !quantity || quantity < 1) {
          return res.status(400).json({ message: "One of the equipment items is not available" });
        }
        const left = item.stock - (used[item._id] || 0);
        if (quantity > left) {
          return res.status(409).json({ message: `Only ${Math.max(left, 0)} ${item.name} left for that time` });
        }
        items.push({
          equipment: item._id,
          name: item.name,
          pricePerHour: item.pricePerHour,
          quantity,
          fee: item.pricePerHour * hours * quantity,
        });
      }
    }

    // ---------- Prices ----------
    const courtFee = hours * court.hourlyRate;
    const equipmentFee = items.reduce((sum, i) => sum + i.fee, 0);
    const doorCharge = players * rules.doorChargePerHead;
    const totalPrice = courtFee + equipmentFee + doorCharge;

    const reservation = await Reservation.create({
      refNo: await nextRefNo(),
      user: req.user._id,
      court: courtId,
      date,
      startTime,
      endTime,
      players,
      equipment: items,
      courtFee,
      equipmentFee,
      doorCharge,
      totalPrice,
      notes,
      paymentOption: option,
      paymentMethod: payment.method,
      paymentReference: payment.reference,
      paymentSubmitted: payment.submitted,
      paymentDeclared: amountDue(totalPrice, option),
      expiresAt: new Date(Date.now() + rules.unpaidExpiryHours * 3600000),
    });

    res.status(201).json(await Reservation.findById(reservation._id).populate("court", "name sport"));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/reservations/:id/pay   (owner) - submit a payment later (before it expires)
const submitPayment = async (req, res) => {
  try {
    await expireUnpaid();
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation || reservation.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    if (reservation.status !== "pending" || reservation.paymentSubmitted) {
      return res.status(400).json({ message: "This reservation cannot accept a payment" });
    }

    const payment = readPayment(req.body);
    if (payment.error) return res.status(400).json({ message: payment.error });
    if (!payment.submitted) {
      return res.status(400).json({ message: "Enter the reference number of your payment" });
    }

    const option = req.body.paymentOption === "full" ? "full" : "downpayment";
    reservation.paymentOption = option;
    reservation.paymentMethod = payment.method;
    reservation.paymentReference = payment.reference;
    reservation.paymentSubmitted = true;
    reservation.paymentDeclared = amountDue(reservation.totalPrice, option);
    reservation.paymentNote = "";
    await reservation.save();
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reservations/my   (customer) - paginated
const getMyReservations = async (req, res) => {
  try {
    await expireUnpaid();
    const filter = await buildFilter(req, { user: req.user._id });
    res.json(await paginate(Reservation, filter, req, listOptions));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reservations   (staff, admin) - paginated, with filters
const getAllReservations = async (req, res) => {
  try {
    await expireUnpaid();
    // ?paymentToVerify=true  -> only reservations waiting for payment verification
    const base = req.query.paymentToVerify ? { status: "pending", paymentSubmitted: true } : {};
    const filter = await buildFilter(req, base);
    res.json(await paginate(Reservation, filter, req, listOptions));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reservations/availability/:courtId?date=YYYY-MM-DD   (booked time slots of one day)
const getAvailability = async (req, res) => {
  try {
    await expireUnpaid();
    const booked = await Reservation.find({
      court: req.params.courtId,
      date: req.query.date,
      status: { $in: ACTIVE },
    })
      .select("startTime endTime status")
      .sort({ startTime: 1 });
    res.json(booked);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reservations/calendar/:courtId?month=YYYY-MM   (booked hours per day, for the colors)
const getCalendar = async (req, res) => {
  try {
    await expireUnpaid();
    const { month } = req.query;
    if (!/^\d{4}-\d{2}$/.test(month || "")) return res.status(400).json({ message: "Invalid month" });

    const court = await Court.findById(req.params.courtId);
    if (!court) return res.status(404).json({ message: "Court not found" });

    const list = await Reservation.find({
      court: court._id,
      date: { $regex: `^${month}` },
      status: { $in: ACTIVE },
    }).select("date startTime endTime");

    const booked = {};
    list.forEach((r) => {
      booked[r.date] = (booked[r.date] || 0) + (toMinutes(r.endTime) - toMinutes(r.startTime)) / 60;
    });

    res.json({ totalHours: (toMinutes(court.closeTime) - toMinutes(court.openTime)) / 60, booked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Cancel (customer or staff) ----------
// Refund rule: the downpayment is refunded if the customer cancels at least 3 days before.
// When staff cancel, the customer is always refunded.
const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });

    const isOwner = reservation.user.toString() === req.user._id.toString();
    const isStaff = req.user.role === "staff";
    if (!isOwner && !isStaff) return res.status(403).json({ message: "Not allowed" });

    if (!ACTIVE.includes(reservation.status)) {
      return res.status(400).json({ message: `Reservation is already ${reservation.status}` });
    }

    let message = "Reservation cancelled.";
    if (reservation.amountPaid > 0) {
      const daysBefore = Math.round((dayStart(reservation.date) - dayStart(today())) / 86400000);
      if (isStaff || daysBefore >= rules.refundDaysBefore) {
        reservation.payments.push({ kind: "refund", amount: -reservation.amountPaid, by: req.user._id });
        reservation.refundAmount = reservation.amountPaid;
        reservation.amountPaid = 0;
        reservation.paymentStatus = "refunded";
        message = `Reservation cancelled. Your payment of PHP ${reservation.refundAmount} will be refunded.`;
      } else {
        message = `Reservation cancelled. No refund, because it is less than ${rules.refundDaysBefore} days before the game.`;
      }
    }

    reservation.status = "cancelled";
    await reservation.save();
    res.json({ message, reservation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Staff actions on a transaction ----------

// PUT /api/reservations/:id/verify-payment
const verifyPayment = async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ message: "Reservation not found" });
    if (r.status !== "pending" || !r.paymentSubmitted) {
      return res.status(400).json({ message: "There is no payment waiting for verification" });
    }

    r.payments.push({
      kind: r.paymentDeclared >= r.totalPrice ? "full" : "downpayment",
      amount: r.paymentDeclared,
      method: r.paymentMethod,
      reference: r.paymentReference,
      by: req.user._id,
    });
    r.amountPaid = r.paymentDeclared;
    r.paymentStatus = r.amountPaid >= r.totalPrice ? "fully_paid" : "downpayment_paid";
    r.status = "confirmed";
    await r.save();
    res.json(r);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/reservations/:id/reject-payment
// The customer can submit a new payment, as long as the reservation has not expired.
const rejectPayment = async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ message: "Reservation not found" });
    if (r.status !== "pending" || !r.paymentSubmitted) {
      return res.status(400).json({ message: "There is no payment waiting for verification" });
    }

    r.paymentSubmitted = false;
    r.paymentReference = "";
    r.paymentNote = req.body.reason || "The payment could not be verified. Please submit it again.";
    await r.save();
    res.json(r);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/reservations/:id/collect-balance   (on the game day)
const collectBalance = async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ message: "Reservation not found" });
    if (r.status !== "confirmed" || r.paymentStatus !== "downpayment_paid") {
      return res.status(400).json({ message: "There is no balance to collect" });
    }

    const balance = r.totalPrice - r.amountPaid;
    r.payments.push({ kind: "balance", amount: balance, method: "Cash / counter", by: req.user._id });
    r.amountPaid = r.totalPrice;
    r.paymentStatus = "fully_paid";
    await r.save();
    res.json(r);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/reservations/:id/complete   (only when fully paid)
const completeReservation = async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ message: "Reservation not found" });
    if (r.status !== "confirmed") {
      return res.status(400).json({ message: "Only confirmed reservations can be completed" });
    }
    if (r.paymentStatus !== "fully_paid") {
      return res.status(400).json({ message: "Collect the balance first" });
    }

    r.status = "completed";
    await r.save();
    res.json(r);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  expireUnpaid,
  createReservation,
  submitPayment,
  getMyReservations,
  getAllReservations,
  getAvailability,
  getCalendar,
  cancelReservation,
  verifyPayment,
  rejectPayment,
  collectBalance,
  completeReservation,
};
```

## 13. `server/controllers/statsController.js`

```javascript
const Reservation = require("../models/Reservation");
const Court = require("../models/Court");
const rules = require("../config/rules");
const { expireUnpaid } = require("./reservationController");
const { rangeFor, today, addDays, dayStart, dayEnd, daysInRange } = require("../utils/dates");

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// "Sales" = money really collected (payments verified by staff, minus refunds)
const paymentsBetween = async (from, to) => {
  const start = dayStart(from);
  const end = dayEnd(to);
  const reservations = await Reservation.find({ "payments.at": { $gte: start, $lte: end } })
    .populate("court", "name sport")
    .populate("user", "name");
  const entries = [];
  reservations.forEach((r) =>
    r.payments.forEach((p) => {
      if (p.at >= start && p.at <= end) entries.push({ reservation: r, payment: p });
    })
  );
  return entries;
};

const sum = (list) => list.reduce((total, x) => total + x, 0);

// Reservations whose game date is inside the range (not cancelled or expired)
const reservationsBetween = (from, to) =>
  Reservation.find({
    date: { $gte: from, $lte: to },
    status: { $nin: ["cancelled", "expired"] },
  }).populate("court", "name sport");

// The 3 busiest hours in a row, like "6:00 PM - 9:00 PM"
const peakLabel = (hourCounts) => {
  let bestStart = 17;
  let best = -1;
  for (let h = 7; h <= 21; h++) {
    const total = (hourCounts[h] || 0) + (hourCounts[h + 1] || 0) + (hourCounts[h + 2] || 0);
    if (total > best) {
      best = total;
      bestStart = h;
    }
  }
  const fmt = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h % 24 >= 12 ? "PM" : "AM"}`;
  return best > 0 ? `${fmt(bestStart)} - ${fmt(bestStart + 3)}` : "No data yet";
};

const countHours = (reservations) => {
  const counts = {};
  reservations.forEach((r) => {
    for (let h = Math.floor(toMinutes(r.startTime) / 60); h < toMinutes(r.endTime) / 60; h++) {
      counts[h] = (counts[h] || 0) + 1;
    }
  });
  return counts;
};

// GET /api/stats/staff?period=today|yesterday|last7|month   (staff)
const staffStats = async (req, res) => {
  try {
    await expireUnpaid();
    const { from, to } = rangeFor(req.query.period);

    const entries = await paymentsBetween(from, to);
    const reservations = await reservationsBetween(from, to).populate("user", "name").sort({ date: 1, startTime: 1 });
    const pendingVerification = await Reservation.countDocuments({
      status: "pending",
      paymentSubmitted: true,
      isArchived: { $ne: true },
    });

    res.json({
      from,
      to,
      totalBookings: reservations.length,
      pendingVerification,
      collected: sum(entries.map((e) => e.payment.amount)),
      completed: reservations.filter((r) => r.status === "completed").length,
      reservations: reservations.slice(0, 100),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/stats/admin?from=&to=   (admin)
const adminStats = async (req, res) => {
  try {
    const to = req.query.to || today();
    const from = req.query.from || addDays(to, -6);

    const entries = await paymentsBetween(from, to);
    const reservations = await reservationsBetween(from, to);

    // Sales per day (for the line chart)
    const perDay = {};
    for (let i = 0; i < daysInRange(from, to); i++) perDay[addDays(from, i)] = 0;
    entries.forEach((e) => {
      const key = `${e.payment.at.getFullYear()}-${String(e.payment.at.getMonth() + 1).padStart(2, "0")}-${String(e.payment.at.getDate()).padStart(2, "0")}`;
      if (key in perDay) perDay[key] += e.payment.amount;
    });

    // Sales per sport and per court
    const bySport = {};
    const byCourt = {};
    entries.forEach((e) => {
      const sport = e.reservation.court ? e.reservation.court.sport : "Other";
      const court = e.reservation.court ? e.reservation.court.name : "Other";
      bySport[sport] = (bySport[sport] || 0) + e.payment.amount;
      byCourt[court] = (byCourt[court] || 0) + e.payment.amount;
    });

    // Most rented equipment
    const equipment = {};
    reservations.forEach((r) =>
      r.equipment.forEach((e) => {
        equipment[e.name] = equipment[e.name] || { name: e.name, quantity: 0, revenue: 0 };
        equipment[e.name].quantity += e.quantity;
        equipment[e.name].revenue += e.fee;
      })
    );

    const totalSales = sum(entries.map((e) => e.payment.amount));
    const toRows = (obj) =>
      Object.entries(obj)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

    res.json({
      from,
      to,
      totalSales,
      totalBookings: reservations.length,
      activeUsers: new Set(reservations.map((r) => r.user.toString())).size,
      averageOrder: reservations.length ? Math.round(sum(reservations.map((r) => r.totalPrice)) / reservations.length) : 0,
      peakHours: peakLabel(countHours(reservations)),
      salesByDay: Object.entries(perDay).map(([date, amount]) => ({ date, amount })),
      salesBySport: toRows(bySport),
      salesByCourt: toRows(byCourt),
      topEquipment: Object.values(equipment).sort((a, b) => b.quantity - a.quantity),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/stats/transactions?from=&to=&page=&limit=   (admin) - every payment, newest first
const transactions = async (req, res) => {
  try {
    const to = req.query.to || today();
    const from = req.query.from || addDays(to, -6);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const rows = (await paymentsBetween(from, to))
      .map((e) => ({
        _id: `${e.reservation._id}-${e.payment.at.getTime()}-${e.payment.kind}`,
        at: e.payment.at,
        refNo: e.reservation.refNo,
        customer: e.reservation.user ? e.reservation.user.name : "(deleted user)",
        court: e.reservation.court ? e.reservation.court.name : "(deleted court)",
        kind: e.payment.kind,
        amount: e.payment.amount,
        status: e.reservation.status,
      }))
      .sort((a, b) => b.at - a.at);

    res.json({
      items: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      limit,
      pages: Math.max(Math.ceil(rows.length / limit), 1),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/stats/monitoring?from=&to=   (admin) - how the courts are used
const monitoring = async (req, res) => {
  try {
    const to = req.query.to || today();
    const from = req.query.from || addDays(to, -6);
    const days = daysInRange(from, to);

    const courts = await Court.find({ isArchived: { $ne: true } }).sort({ sport: 1, name: 1 });
    const reservations = await reservationsBetween(from, to);

    const bookedHours = {};
    reservations.forEach((r) => {
      if (!r.court) return;
      bookedHours[r.court._id] =
        (bookedHours[r.court._id] || 0) + (toMinutes(r.endTime) - toMinutes(r.startTime)) / 60;
    });

    const usage = courts.map((court) => {
      const open = (toMinutes(court.closeTime) - toMinutes(court.openTime)) / 60;
      const percent = Math.min(Math.round(((bookedHours[court._id] || 0) / (open * days)) * 100), 100);
      return { _id: court._id, name: court.name, sport: court.sport, status: court.status, usage: percent };
    });

    const hourCounts = countHours(reservations);
    const byHour = [];
    for (let h = 7; h < 24; h++) byHour.push({ hour: h, count: hourCounts[h] || 0 });

    res.json({
      from,
      to,
      activeCourts: courts.filter((c) => c.status === "available").length,
      maintenanceCourts: courts.filter((c) => c.status === "maintenance").length,
      averageUsage: usage.length ? Math.round(sum(usage.map((u) => u.usage)) / usage.length) : 0,
      peakHours: peakLabel(hourCounts),
      usage: usage.sort((a, b) => b.usage - a.usage),
      byHour,
      openTime: rules.openTime,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { staffStats, adminStats, transactions, monitoring };
```

## 14. `server/controllers/userController.js`

```javascript
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { paginate, searchRegex } = require("../utils/paginate");
const { randomPin } = require("../utils/pin");
const { passwordProblems, isEmail, isPhone } = require("../utils/validators");

const hidden = "-password -securityAnswer -pin";

// GET /api/users?group=customers|staff&search=&page=&limit=   (admin)
// "staff" group = staff and admin accounts
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

// POST /api/users   (admin) - create a staff or admin account with a temporary PIN
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

    // The admin gives this temporary PIN to the new staff. They must change it at first login.
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

// PUT /api/users/:id   (admin) - name, phone, role, optional new password
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

// PUT /api/users/:id/reset-pin   (admin) - for staff or admin who forgot their PIN
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
```

## 15. `server/middleware/auth.js`

```javascript
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Checks that the request has a valid login token
const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);

    // A "pin" token is only valid for the PIN step of the login
    if (decoded.stage) {
      return res.status(401).json({ message: "Please finish the PIN step first" });
    }

    req.user = await User.findById(decoded.id).select("-password -securityAnswer -pin");

    if (!req.user || req.user.isArchived) {
      return res.status(401).json({ message: "Account is deactivated or no longer exists" });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Allow only some roles: requireRole("staff", "admin")
const requireRole = (...roles) => (req, res, next) => {
  if (req.user && roles.includes(req.user.role)) return next();
  res.status(403).json({ message: "Your role cannot do this" });
};

module.exports = {
  protect,
  requireRole,
  customerOnly: requireRole("user"),
  staffOnly: requireRole("staff"), // staff manage the transactions
  adminOnly: requireRole("admin"), // admin monitors and manages accounts
  staffOrAdmin: requireRole("staff", "admin"),
};
```

## 16. `server/models/Court.js`

```javascript
const mongoose = require("mongoose");

const courtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sport: { type: String, required: true }, // Basketball, Volleyball, Badminton, Pickleball
    location: { type: String, required: true },
    hourlyRate: { type: Number, required: true, min: 0 },
    openTime: { type: String, default: "07:00" }, // HH:mm
    closeTime: { type: String, default: "24:00" }, // HH:mm ("24:00" = midnight)
    description: { type: String, default: "" },
    status: { type: String, enum: ["available", "maintenance"], default: "available" },

    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Court", courtSchema);
```

## 17. `server/models/Equipment.js`

```javascript
const mongoose = require("mongoose");

// Equipment that customers can rent together with a court (rackets, balls, shoes...)
const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sport: { type: String, default: "All" }, // "All" means any sport
    pricePerHour: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 }, // how many pieces the venue owns
    description: { type: String, default: "" },
    status: { type: String, enum: ["available", "unavailable"], default: "available" },

    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
```

## 18. `server/models/Reservation.js`

```javascript
const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    refNo: { type: String, index: true }, // MPS-000001
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    court: { type: mongoose.Schema.Types.ObjectId, ref: "Court", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    players: { type: Number, default: 1, min: 1 },

    // Equipment rented with the court
    equipment: [
      {
        _id: false,
        equipment: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
        name: String,
        pricePerHour: Number,
        quantity: Number,
        fee: Number, // pricePerHour x hours x quantity
      },
    ],

    // Prices (computed by the server)
    courtFee: { type: Number, required: true },
    equipmentFee: { type: Number, default: 0 },
    doorCharge: { type: Number, required: true },
    totalPrice: { type: Number, required: true },

    // Payment the customer submitted
    paymentOption: { type: String, enum: ["downpayment", "full"], default: "downpayment" },
    paymentMethod: { type: String, default: "" },
    paymentReference: { type: String, default: "" },
    paymentSubmitted: { type: Boolean, default: false }, // true = waiting for staff to verify
    paymentDeclared: { type: Number, default: 0 }, // amount the customer says was paid
    paymentNote: { type: String, default: "" }, // reason when staff reject a payment

    // Money really collected (verified by staff). Refunds are negative amounts.
    payments: [
      {
        _id: false,
        kind: { type: String, enum: ["downpayment", "full", "balance", "refund"] },
        amount: Number,
        method: String,
        reference: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],
    amountPaid: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "downpayment_paid", "fully_paid", "refunded"],
      default: "unpaid",
    },
    refundAmount: { type: Number, default: 0 },

    expiresAt: { type: Date }, // unpaid reservations are released after this time
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "expired"],
      default: "pending",
    },

    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reservation", reservationSchema);
```

## 19. `server/models/User.js`

```javascript
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true }, // staff and admin
    password: { type: String, required: true }, // bcrypt hash
    phone: { type: String, default: "" },
    role: { type: String, enum: ["user", "staff", "admin"], default: "user" },

    // Password recovery for customers
    securityQuestion: { type: String, default: "" },
    securityAnswer: { type: String, default: "" }, // bcrypt hash of the lowercase answer

    // PIN for staff and admin (login step 2 and password recovery)
    pin: { type: String, default: "" }, // bcrypt hash
    pinAttempts: { type: Number, default: 0 },
    pinLockedUntil: { type: Date, default: null },
    mustChangePin: { type: Boolean, default: false }, // true after an admin sets a temporary PIN

    // Archive module
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
```

## 20. `server/routes/archiveRoutes.js`

```javascript
const express = require("express");
const {
  getArchived,
  archiveRecord,
  restoreRecord,
  deletePermanently,
} = require("../controllers/archiveController");
const { protect, staffOrAdmin } = require("../middleware/auth");

const router = express.Router();

// :type is one of  reservations | courts | equipment | users
// The controller checks the role: staff manage reservations/courts/equipment,
// admin manages users and can only view the rest.
router.use(protect, staffOrAdmin);

router.get("/:type", getArchived);
router.put("/:type/:id/archive", archiveRecord);
router.put("/:type/:id/restore", restoreRecord);
router.delete("/:type/:id", deletePermanently);

module.exports = router;
```

## 21. `server/routes/authRoutes.js`

```javascript
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
```

## 22. `server/routes/courtRoutes.js`

```javascript
const express = require("express");
const { getCourts, getCourtById, createCourt, updateCourt } = require("../controllers/courtController");
const { protect, staffOnly } = require("../middleware/auth");

const router = express.Router();

// Anyone can browse the courts. Only staff manage them.
router.get("/", getCourts);
router.get("/:id", getCourtById);
router.post("/", protect, staffOnly, createCourt);
router.put("/:id", protect, staffOnly, updateCourt);

module.exports = router;
```

## 23. `server/routes/equipmentRoutes.js`

```javascript
const express = require("express");
const { getEquipment, createEquipment, updateEquipment } = require("../controllers/equipmentController");
const { protect, staffOnly } = require("../middleware/auth");

const router = express.Router();

// Anyone can browse the equipment. Only staff manage it.
router.get("/", getEquipment);
router.post("/", protect, staffOnly, createEquipment);
router.put("/:id", protect, staffOnly, updateEquipment);

module.exports = router;
```

## 24. `server/routes/reservationRoutes.js`

```javascript
const express = require("express");
const {
  createReservation,
  submitPayment,
  getMyReservations,
  getAllReservations,
  getAvailability,
  getCalendar,
  cancelReservation,
  verifyPayment,
  rejectPayment,
  collectBalance,
  completeReservation,
} = require("../controllers/reservationController");
const { protect, customerOnly, staffOnly, staffOrAdmin } = require("../middleware/auth");

const router = express.Router();

// Order matters: fixed paths ("/my", "/availability") must come before "/:id"
router.get("/my", protect, customerOnly, getMyReservations);
router.get("/availability/:courtId", getAvailability);
router.get("/calendar/:courtId", getCalendar);
router.get("/", protect, staffOrAdmin, getAllReservations); // admin can only view

// Customer
router.post("/", protect, customerOnly, createReservation);
router.put("/:id/pay", protect, customerOnly, submitPayment);

// Customer (own reservation) or staff
router.put("/:id/cancel", protect, cancelReservation);

// Staff handle the transactions
router.put("/:id/verify-payment", protect, staffOnly, verifyPayment);
router.put("/:id/reject-payment", protect, staffOnly, rejectPayment);
router.put("/:id/collect-balance", protect, staffOnly, collectBalance);
router.put("/:id/complete", protect, staffOnly, completeReservation);

module.exports = router;
```

## 25. `server/routes/statsRoutes.js`

```javascript
const express = require("express");
const { staffStats, adminStats, transactions, monitoring } = require("../controllers/statsController");
const { protect, staffOnly, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/staff", protect, staffOnly, staffStats); // today / yesterday / last 7 days / month
router.get("/admin", protect, adminOnly, adminStats); // sales and analytics
router.get("/transactions", protect, adminOnly, transactions);
router.get("/monitoring", protect, adminOnly, monitoring);

module.exports = router;
```

## 26. `server/routes/userRoutes.js`

```javascript
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
```

## 27. `server/utils/dates.js`

```javascript
// Date helpers. Dates are saved as text "YYYY-MM-DD" and times as "HH:mm".
const pad = (n) => String(n).padStart(2, "0");

const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const today = () => toDateString(new Date());

const addDays = (dateString, n) => {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateString(d);
};

const dayStart = (dateString) => new Date(`${dateString}T00:00:00`);
const dayEnd = (dateString) => new Date(`${dateString}T23:59:59.999`);

// Number of days between two date strings, counting both ends
const daysInRange = (from, to) =>
  Math.max(Math.round((dayStart(to) - dayStart(from)) / 86400000) + 1, 1);

// "today" | "yesterday" | "last7" | "month"  ->  { from, to }
const rangeFor = (period) => {
  const t = today();
  if (period === "yesterday") {
    const y = addDays(t, -1);
    return { from: y, to: y };
  }
  if (period === "last7") return { from: addDays(t, -6), to: t };
  if (period === "month") return { from: `${t.slice(0, 8)}01`, to: t };
  return { from: t, to: t };
};

module.exports = { today, addDays, dayStart, dayEnd, daysInRange, rangeFor };
```

## 28. `server/utils/paginate.js`

```javascript
// Server-side pagination: returns only one page of records and the totals
// options: { sort, select, populate: [["field", "fields to show"], ...] }
const paginate = async (Model, filter, req, options = {}) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  let query = Model.find(filter)
    .sort(options.sort || {})
    .skip((page - 1) * limit)
    .limit(limit);

  if (options.select) query = query.select(options.select);
  (options.populate || []).forEach(([path, fields]) => {
    query = query.populate(path, fields);
  });

  const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
  return { items, total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) };
};

// Makes user text safe to use inside a search (regular expression)
const searchRegex = (text) =>
  new RegExp(String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

module.exports = { paginate, searchRegex };
```

## 29. `server/utils/pin.js`

```javascript
const bcrypt = require("bcryptjs");
const rules = require("../config/rules");

// Checks a PIN and handles the lock after too many wrong attempts.
// Returns { ok: true } or { ok: false, message }
const checkPin = async (user, pin) => {
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const minutes = Math.ceil((user.pinLockedUntil - new Date()) / 60000);
    return { ok: false, message: `Account locked. Try again in ${minutes} minute(s).` };
  }

  const correct = user.pin && (await bcrypt.compare(pin || "", user.pin));

  if (correct) {
    user.pinAttempts = 0;
    user.pinLockedUntil = null;
    await user.save();
    return { ok: true };
  }

  user.pinAttempts += 1;
  if (user.pinAttempts >= rules.pinMaxAttempts) {
    user.pinAttempts = 0;
    user.pinLockedUntil = new Date(Date.now() + rules.pinLockMinutes * 60000);
    await user.save();
    return {
      ok: false,
      message: `Too many wrong attempts. Account locked for ${rules.pinLockMinutes} minutes.`,
    };
  }

  await user.save();
  return {
    ok: false,
    message: `Wrong PIN. ${rules.pinMaxAttempts - user.pinAttempts} attempt(s) left.`,
  };
};

// A random 6-digit PIN (used as a temporary PIN when an admin resets a PIN)
const randomPin = () => String(Math.floor(100000 + Math.random() * 900000));

module.exports = { checkPin, randomPin };
```

## 30. `server/utils/validators.js`

```javascript
// Validation helpers (the React app has the same rules, so the user sees them while typing)

// Returns a list of the password rules that are NOT met yet
const passwordProblems = (password = "") => {
  const problems = [];
  if (password.length < 8) problems.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) problems.push("1 uppercase letter");
  if (!/[a-z]/.test(password)) problems.push("1 lowercase letter");
  if (!/\d/.test(password)) problems.push("1 number");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("1 special character");
  return problems;
};

const isEmail = (email = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX (empty is allowed)
const isPhone = (phone = "") =>
  !phone || /^(09\d{9}|\+639\d{9})$/.test(phone.replace(/[\s-]/g, ""));

const isPin = (pin = "") => /^\d{6}$/.test(pin);

// Payment reference numbers: letters, numbers and dashes, 6 to 30 characters
const isReference = (ref = "") => /^[A-Za-z0-9-]{6,30}$/.test(ref);

module.exports = { passwordProblems, isEmail, isPhone, isPin, isReference };
```

## 31. `client/public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MetParkSports | Court Reservation System</title>

    <!-- Font: Poppins (to use another font, change it here and in App.css: --font) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

## 32. `client/src/App.css`

```css
/* =========================================================
   MetParkSports theme: dark navy, electric blue, white cards
   ========================================================= */
:root {
  --font: "Poppins", Helvetica, sans-serif;
  --navy: #0b1f3f;
  --navy-2: #071630;
  --blue: #1769f5;
  --blue-dark: #0f56cc;
  --bg: #f4f7fb;
  --line: #e2e8f0;
  --ink: #0f1b2d;
  --muted: #64748b;
}

/* ---------- Base ---------- */
* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font); background: var(--bg); color: var(--ink); }
h1, h2, h3, p { margin: 0; }
a { color: inherit; text-decoration: none; }
hr { border: 0; border-top: 1px solid var(--line); margin: 16px 0; }
.muted { color: var(--muted); font-size: 14px; }
.small { font-size: 12px; }
.block { display: block; margin: 20px 0 6px; }

/* ---------- Buttons ---------- */
button { font-family: inherit; cursor: pointer; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-blue { display: inline-block; background: var(--blue); color: #fff; border: 0; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; text-align: center; }
.btn-blue:hover:not(:disabled) { background: var(--blue-dark); }
.btn-line { display: inline-block; background: #fff; color: var(--ink); border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 18px; font-size: 14px; font-weight: 500; text-align: center; }
.btn-line:hover:not(:disabled) { border-color: var(--blue); color: var(--blue); }
.btn-outline-light { background: transparent; color: #fff; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 8px; padding: 8px 18px; font-size: 14px; }
.btn-outline-light:hover { background: rgba(255, 255, 255, 0.15); }
.big { padding: 13px 30px; font-size: 16px; }
.small.btn-blue, .small.btn-line { padding: 5px 12px; font-size: 12px; }
.danger { color: #b42318; }
.block-btn { display: block; width: 100%; margin-top: 12px; }

/* ---------- Logo ---------- */
.logo { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 18px; color: #fff; }
.logo-m { color: #3b82f6; font-weight: 800; font-style: italic; font-size: 26px; line-height: 1; }
.logo-dark { color: var(--ink); }

/* ---------- Top bar (visitors and customers) ---------- */
.site-nav { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; background: var(--navy); color: #fff; padding: 14px 40px; }
.site-nav.overlay { background: transparent; }
.site-links { display: flex; gap: 28px; font-size: 14px; flex-wrap: wrap; }
.site-links a { padding-bottom: 4px; border-bottom: 2px solid transparent; color: #dbe6f7; }
.site-links a:hover { color: #fff; }
.site-links a.active { color: #fff; border-bottom-color: #3b82f6; }
.site-actions { display: flex; align-items: center; gap: 12px; }
.site-user { font-size: 14px; color: #fff; }

/* ---------- Landing ---------- */
.hero { min-height: 640px; background-size: cover; background-position: center bottom; color: #fff; display: flex; flex-direction: column; }
.hero-copy { padding: 70px 40px 90px 8%; max-width: 760px; }
.hero-copy h1 { font-size: clamp(40px, 6vw, 68px); font-weight: 700; line-height: 1.05; }
.hero-copy h1 span { color: #3b82f6; }
.hero-copy p { font-size: 18px; margin: 20px 0 28px; max-width: 520px; opacity: 0.92; }
.hero-buttons { display: flex; gap: 14px; flex-wrap: wrap; }
.btn-outline-light.big { border-radius: 8px; }
.section { padding: 64px 8%; text-align: center; background: #fff; }
.section.alt { background: var(--bg); }
.section h2 { font-size: 32px; font-weight: 700; }
.section-sub { color: var(--muted); margin: 8px 0 32px; }
.arena-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.arena-card { height: 190px; border-radius: 14px; background-size: cover; background-position: center; color: #fff; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; padding: 18px; text-align: left; }
.arena-card b { font-size: 20px; }
.arena-card span { font-size: 13px; opacity: 0.9; margin-top: 4px; }
.arena-card:hover { transform: translateY(-3px); transition: 0.15s; }
.feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 32px; }
.feature { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 24px; }
.feature-icon { width: 44px; height: 44px; border-radius: 50%; background: #e1ecff; margin: 0 auto 14px; }
.feature p { color: var(--muted); font-size: 14px; margin-top: 6px; }
.about { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; text-align: left; }
.about img { width: 100%; border-radius: 18px; display: block; }
.about h2 { margin-bottom: 14px; }
.about p { line-height: 1.7; color: #334155; margin-bottom: 14px; }
.cta { color: #fff; text-align: center; padding: 70px 20px; background-size: cover; background-position: center; }
.cta h2 { font-size: 34px; font-weight: 700; }
.cta p { margin: 8px 0 24px; }
.footer { background: var(--navy-2); color: #cbd5e1; padding: 40px 8% 24px; }
.footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 32px; }
.footer-grid b { display: block; color: #fff; margin-bottom: 10px; }
.footer-grid a { display: block; margin: 6px 0; font-size: 14px; }
.footer-grid a:hover { color: #fff; }
.footer-tag { margin-top: 10px; font-size: 14px; }
.staff-link { opacity: 0.6; }
.footer-note { border-top: 1px solid rgba(255, 255, 255, 0.15); margin-top: 28px; padding-top: 18px; font-size: 12px; opacity: 0.8; }

/* ---------- Browse pages ---------- */
.banner { color: #fff; padding: 54px 8%; background-size: cover; background-position: center; }
.banner h1 { font-size: 32px; font-weight: 700; }
.banner p { opacity: 0.9; margin-top: 6px; }
.browse { display: grid; grid-template-columns: 220px 1fr; gap: 24px; padding: 28px 8% 48px; align-items: start; }
.filter-card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 18px; }
.radio { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 14px; }
.radio input { width: auto; }
.browse-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 18px; }
.item-card { background: #fff; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.item-photo { height: 130px; background-size: cover; background-position: center; color: #fff; padding: 12px 14px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.item-body { padding: 16px; }
.item-body h3 { font-size: 17px; margin: 6px 0; }
.item-price { font-size: 20px; font-weight: 700; color: var(--blue); }
.item-price small { font-size: 12px; color: var(--muted); font-weight: 400; }
.item-warn { color: #b45309; font-size: 13px; margin-top: 6px; }
.item-buttons { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.tag { display: inline-block; background: #e1ecff; color: #1d4fb8; border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 600; }
.details p { margin: 8px 0; }

/* ---------- Page layout ---------- */
.page-pad { padding: 28px 8% 48px; }
.shell-main .page-pad { padding: 32px 36px 48px; }
.page-pad.narrow { max-width: 760px; margin: 0 auto; }
.page-title { font-size: 28px; font-weight: 700; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.section-title { font-size: 20px; margin: 28px 0 12px; }
.panel { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 24px; margin-bottom: 20px; }
.panel.flush { padding: 0; overflow: hidden; }
.panel h3 { font-size: 18px; margin-bottom: 8px; }
.panel-title { padding: 18px 20px 4px; font-size: 18px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; margin-top: 8px; }
.two-col.wide-left { grid-template-columns: 1.7fr 1fr; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.select-small { width: 180px; }
.filters { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin: 16px 0; }
.filters input, .filters select { width: auto; min-width: 160px; flex: 1; max-width: 260px; }
.filters .check, .inline-label { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.filters .check input { width: auto; min-width: 0; flex: none; }
.inline-label input { width: auto; }
.row-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.quick { display: block; background: var(--blue); color: #fff; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-weight: 600; font-size: 14px; text-align: center; }
.quick:hover { background: var(--blue-dark); }
.pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; }

/* ---------- Stat cards ---------- */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 22px; }
.stat-grid.three { grid-template-columns: repeat(3, 1fr); }
.stat { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 18px 20px; }
.stat span { display: block; font-size: 12px; color: var(--muted); }
.stat b { display: block; font-size: 28px; font-weight: 700; margin: 6px 0 2px; }
.stat b.small-value { font-size: 18px; margin: 12px 0 8px; }
.stat small { font-size: 12px; color: var(--muted); }

/* ---------- Forms ---------- */
input, select, textarea { width: 100%; padding: 10px 13px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-family: inherit; background: #fff; color: var(--ink); }
input:focus, select:focus, textarea:focus { outline: 2px solid rgba(23, 105, 245, 0.35); border-color: var(--blue); }
.field { margin-top: 14px; }
.field label, .label, .pin-label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #334155; }
.label { margin-top: 14px; }
.field-msg { font-size: 12px; margin-top: 5px; color: var(--muted); }
.field-msg.bad { color: #b42318; }
.field-msg.good { color: #157347; }
.kv { display: flex; justify-content: space-between; gap: 16px; font-size: 14px; margin-top: 12px; }
.kv span { color: #475569; }
.kv.total { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 16px; }
.kv.total b { font-size: 26px; color: var(--blue); }
.info-box { background: #e8f0ff; color: #1e3a8a; border-radius: 10px; padding: 12px 16px; font-size: 13px; line-height: 1.6; margin-top: 16px; }
.info-box.warn { background: #fff1d6; color: #8a4b00; }

/* ---------- Booking ---------- */
.stepper { display: flex; gap: 8px; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px 22px; margin: 16px 0 22px; flex-wrap: wrap; }
.step { display: flex; align-items: center; gap: 10px; flex: 1; font-size: 13px; font-weight: 500; color: var(--muted); min-width: 120px; }
.step span { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; border: 2px solid #cbd5e1; background: #fff; flex: none; }
.step.now { color: var(--ink); }
.step.now span { background: var(--blue); border-color: var(--blue); color: #fff; box-shadow: 0 0 0 3px #cfe0ff; }
.step.done { color: var(--ink); }
.step.done span { background: var(--blue); border-color: var(--blue); color: #fff; }
.step-buttons { display: flex; justify-content: space-between; margin-top: 24px; }
.eq-row { display: grid; grid-template-columns: 1fr 100px auto; gap: 12px; align-items: end; }
.eq-row .btn-blue { margin-bottom: 0; height: 40px; }
.line { display: flex; justify-content: space-between; padding: 12px 0; border-top: 1px solid var(--line); font-size: 14px; gap: 12px; }
.link-red { background: none; border: 0; color: #b42318; margin-left: 14px; font-size: 13px; }
.pay-now { background: #f1f6ff; border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
.pay-now b { font-size: 24px; color: var(--blue); }
.summary h3 { margin-bottom: 4px; }

/* Calendar */
.calendar { margin-top: 6px; }
.cal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.cal-head button { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; width: 34px; height: 34px; font-size: 18px; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.cal-weekdays { margin-bottom: 6px; text-align: center; font-size: 12px; color: var(--muted); }
.cal-day { height: 40px; border-radius: 8px; border: 1px solid transparent; font-size: 14px; font-weight: 500; }
.cal-day.free { background: #dcf5e6; color: #14663f; }
.cal-day.part { background: #fff1c9; color: #7a5600; }
.cal-day.full { background: #fde0dc; color: #9b2a1b; }
.cal-day.off { background: #f1f5f9; color: #a8b3c2; }
.cal-day.selected { background: var(--blue); color: #fff; border-color: var(--blue); }
.cal-legend { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; font-size: 12px; color: #475569; }
.cal-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.cal-legend i.free { background: #86d7a6; }
.cal-legend i.part { background: #f5cf5c; }
.cal-legend i.full { background: #f19b8f; }
.cal-legend i.selected { background: var(--blue); }

/* Hours */
.hour-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; margin: 12px 0; max-height: 330px; overflow-y: auto; padding-right: 4px; }
.hour { border-radius: 8px; border: 1px solid transparent; padding: 8px 6px; font-size: 13px; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.hour small { font-size: 10px; font-weight: 500; }
.hour.vacant { background: #e8f8ee; color: #14663f; border-color: #bfe8cf; }
.hour.reserved { background: #fde0dc; color: #9b2a1b; }
.hour.selected { background: var(--blue); color: #fff; }

/* Submitted */
.done-card { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 36px 40px; text-align: center; }
.done-card .kv { text-align: left; }
.done-check { width: 64px; height: 64px; border-radius: 50%; background: #ddf5e8; color: #157347; font-size: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
.done-card h1 { font-size: 28px; margin-bottom: 10px; }
.done-card .muted { margin: 12px auto 0; max-width: 460px; }
.tracker { display: flex; margin: 28px 0 12px; }
.tracker div { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
.tracker span { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 12px; background: #fff; }
.tracker .done span { background: var(--blue); border-color: var(--blue); color: #fff; }
.tracker .now span { border-color: var(--blue); color: var(--blue); }
.tracker .now, .tracker .done { color: var(--ink); }
.sum-box { background: var(--bg); border-radius: 10px; padding: 8px 20px 18px; margin-top: 22px; text-align: left; }
.center-buttons { display: flex; gap: 12px; justify-content: center; margin-top: 24px; flex-wrap: wrap; }

/* ---------- Staff and admin layout ---------- */
.shell { display: flex; min-height: 100vh; }
.sidebar { width: 240px; flex: none; background: var(--navy); color: #fff; padding: 24px 14px; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
.sidebar-logo { padding: 0 10px 26px; }
.side-link { display: block; padding: 11px 14px; border-radius: 8px; font-size: 14px; margin-bottom: 4px; color: #b6c4da; }
.side-link:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
.side-link.active { background: var(--blue); color: #fff; font-weight: 600; }
.side-spacer { flex: 1; }
.side-user { border-top: 1px solid rgba(255, 255, 255, 0.18); padding: 16px 10px 0; font-size: 13px; color: #b6c4da; }
.side-user b { color: #fff; font-size: 14px; }
.side-user-links { display: flex; align-items: center; gap: 16px; margin-top: 12px; }
.side-user-links a { color: #dbe6f7; }
.side-user-links button { background: transparent; color: #fff; border: 1px solid #8fa6c4; border-radius: 8px; padding: 5px 14px; font-size: 13px; }
.shell-main { flex: 1; min-width: 0; }

/* ---------- Charts ---------- */
.line-chart { width: 100%; height: auto; }
.bar-row { margin-bottom: 16px; }
.bar-head { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
.bar-track { background: #e8eef7; border-radius: 999px; height: 10px; }
.bar-fill { height: 10px; border-radius: 999px; }
.hour-chart { display: flex; align-items: flex-end; height: 230px; gap: 4px; border-bottom: 1px solid var(--line); }
.hour-col { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 6px; font-size: 10px; color: var(--muted); }
.hour-bar { width: 70%; background: #bfd4ff; border-radius: 6px 6px 0 0; min-height: 2px; }
.hour-bar.peak { background: var(--blue); }
.temp-pin { font-size: 36px; font-weight: 700; letter-spacing: 8px; text-align: center; color: var(--blue); margin: 12px 0; }

/* ---------- Checklist ---------- */
.checklist { list-style: none; padding: 0; margin: 10px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 12px; color: var(--muted); }
.checklist li.ok { color: #157347; }
.checklist span { display: inline-block; width: 14px; }

/* ---------- PIN boxes ---------- */
.pin-row { display: flex; gap: 10px; margin: 8px 0 4px; }
.pin-box { width: 46px; height: 54px; text-align: center; font-size: 22px; padding: 0; border-radius: 10px; }

/* =========================================================
   Glass pop-ups (login, sign up, forgot password, set PIN)
   ========================================================= */
.modal-overlay { position: fixed; inset: 0; background: rgba(5, 15, 30, 0.5); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.glass-modal { position: relative; width: 100%; max-width: 440px; max-height: 92vh; overflow-y: auto; padding: 34px; border-radius: 22px; color: #fff; background: rgba(255, 255, 255, 0.14); border: 1px solid rgba(255, 255, 255, 0.35); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5); }
.modal-close { position: absolute; top: 12px; right: 18px; background: none; border: 0; color: #fff; font-size: 30px; line-height: 1; }
.modal-title { font-size: 28px; font-weight: 700; color: #fff; }
.modal-sub { font-size: 14px; opacity: 0.85; margin-top: 4px; }
.glass-modal .field label, .glass-modal .pin-label { color: #fff; }
.glass-modal .pin-label { margin-top: 16px; }
.glass-modal input, .glass-modal select { background: rgba(255, 255, 255, 0.14); border: 1px solid rgba(255, 255, 255, 0.4); color: #fff; }
.glass-modal input::placeholder { color: rgba(255, 255, 255, 0.65); }
.glass-modal select option { color: var(--ink); }
.glass-modal .field-msg { color: rgba(255, 255, 255, 0.75); }
.glass-modal .field-msg.bad { color: #ffb4a9; }
.glass-modal .field-msg.good { color: #86efac; }
.glass-modal .checklist { color: rgba(255, 255, 255, 0.7); }
.glass-modal .checklist li.ok { color: #86efac; }
.glass-modal .pin-box { color: #fff; }
.modal-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; margin-top: 14px; }
.modal-row a, .modal-hint a { text-decoration: underline; font-weight: 600; }
.remember { display: flex; align-items: center; gap: 8px; }
.remember input { width: auto; }
.glass-btn { width: 100%; margin-top: 22px; padding: 13px; background: var(--blue); color: #fff; border: 0; border-radius: 8px; font-size: 15px; font-weight: 600; }
.glass-btn:hover:not(:disabled) { background: var(--blue-dark); }
.modal-hint { text-align: center; font-size: 13px; margin-top: 16px; }
.modal-note { margin-top: 14px; padding: 10px 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.14); font-size: 12px; }
.modal-question { margin-top: 16px; font-weight: 600; }

/* ---------- Small screens ---------- */
@media (max-width: 900px) {
  .arena-grid, .feature-grid, .stat-grid, .stat-grid.three { grid-template-columns: repeat(2, 1fr); }
  .about, .two-col, .two-col.wide-left, .footer-grid, .browse { grid-template-columns: 1fr; }
  .site-nav { padding: 14px 20px; }
  .hero-copy { padding: 40px 24px 60px; }
  .shell { flex-direction: column; }
  .sidebar { width: auto; height: auto; position: static; }
  .shell-main .page-pad { padding: 24px 20px; }
  .row2, .eq-row { grid-template-columns: 1fr; }
}
```

## 33. `client/src/App.js`

```javascript
import { ConfigProvider } from "antd";
import AppController from "./components/AppController";
import { AuthProvider } from "./auth/AuthContext";

// Ant Design colors and font follow our design
const theme = {
  token: {
    colorPrimary: "#1769F5",
    fontFamily: "'Poppins', Helvetica, sans-serif",
    borderRadius: 8,
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <AppController />
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
```

## 34. `client/src/api.js`

```javascript
import axios from "axios";

// One axios instance used by every component
const api = axios.create({
  baseURL: "http://localhost:8000/api",
});

// Automatically attach the login token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

## 35. `client/src/index.js`

```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "./App.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
```

## 36. `client/src/auth/AuthContext.js`

```javascript
import { createContext, useContext, useState } from "react";
import api from "../api";

const AuthContext = createContext();

// Custom hook so components can write:  const { user, login } = useAuth();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Read the saved user from localStorage so refresh keeps you logged in
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const saveSession = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  // Customers are logged in right away.
  // Staff and admin get { pinRequired: true, pinToken } and must call verifyPin next.
  const login = async (identifier, password) => {
    const response = await api.post("/auth/login", { identifier, password });
    if (!response.data.pinRequired) saveSession(response.data);
    return response.data;
  };

  // Step 2 for staff and admin
  const verifyPin = async (pinToken, pin) => {
    const response = await api.post("/auth/verify-pin", { pinToken, pin });
    saveSession({
      token: response.data.token,
      user: { ...response.data.user, mustChangePin: response.data.mustChangePin },
    });
    return response.data;
  };

  const register = async (form) => {
    const response = await api.post("/auth/register", form);
    saveSession(response.data);
    return response.data.user;
  };

  // Used after the profile or PIN is changed
  const updateUser = (changes) => {
    const updated = { ...user, ...changes };
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyPin, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## 37. `client/src/components/AppController.js`

```javascript
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import SiteLayout from "./SiteLayout";
import SidebarLayout from "./SidebarLayout";
import RoleLayout from "./RoleLayout";
import Landing from "../pages/Landing";
import Courts from "../pages/Courts";
import Equipment from "../pages/Equipment";
import Book from "../pages/Book";
import MyReservations from "../pages/MyReservations";
import Profile from "../pages/Profile";
import ArchivePage from "../pages/ArchivePage";
import StaffDashboard from "../pages/staff/StaffDashboard";
import StaffReservations from "../pages/staff/StaffReservations";
import StaffCatalog from "../pages/staff/StaffCatalog";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminReports from "../pages/admin/AdminReports";
import AdminMonitoring from "../pages/admin/AdminMonitoring";
import AdminUsers from "../pages/admin/AdminUsers";

const AppController = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* The landing page. Login, Sign up, Forgot password, Staff login and Set PIN open as pop-ups on top of it */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Landing modal="login" />} />
        <Route path="/register" element={<Landing modal="register" />} />
        <Route path="/forgot-password" element={<Landing modal="forgot" />} />
        <Route path="/staff-login" element={<Landing modal="staff" />} />
        <Route path="/set-pin" element={<Landing modal="setpin" />} />

        {/* Public pages and customer pages: top bar */}
        <Route element={<SiteLayout />}>
          <Route path="/courts" element={<Courts />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route element={<ProtectedRoute roles={["user"]}><Outlet /></ProtectedRoute>}>
            <Route path="/book" element={<Book />} />
            <Route path="/my-reservations" element={<MyReservations />} />
          </Route>
        </Route>

        {/* Profile: top bar for customers, sidebar for staff and admin */}
        <Route element={<ProtectedRoute><RoleLayout /></ProtectedRoute>}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Staff: handle the transactions, courts, equipment and archive */}
        <Route element={<ProtectedRoute roles={["staff"]}><SidebarLayout /></ProtectedRoute>}>
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/reservations" element={<StaffReservations />} />
          <Route path="/staff/catalog" element={<StaffCatalog />} />
          <Route path="/staff/archive" element={<ArchivePage />} />
        </Route>

        {/* Admin: sales, analytics, court monitoring and accounts */}
        <Route element={<ProtectedRoute roles={["admin"]}><SidebarLayout /></ProtectedRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/monitoring" element={<AdminMonitoring />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/archive" element={<ArchivePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppController;
```

## 38. `client/src/components/AuthModal.js`

```javascript
// The glass pop-up frame used by Login, Sign up, Forgot password and Set PIN
const AuthModal = ({ title, subtitle, onClose, children }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* stopPropagation: clicking inside the frame must not close it */}
      <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
        <h2 className="modal-title">{title}</h2>
        {subtitle && <p className="modal-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
};

export default AuthModal;
```

## 39. `client/src/components/BarList.js`

```javascript
// Horizontal bars. rows = [{ label: "Basketball", value: 20750, text: "₱20,750" }]
const BarList = ({ rows, color = "#1769F5" }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (rows.length === 0) return <p className="muted">No data for this period.</p>;
  return (
    <div>
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <div className="bar-head"><span>{row.label}</span><b>{row.text}</b></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(row.value / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
};

export default BarList;
```

## 40. `client/src/components/BookingCalendar.js`

```javascript
import { useState, useEffect } from "react";
import api from "../api";

const pad = (n) => String(n).padStart(2, "0");
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// A month calendar. Each day is colored:
//   green = vacant, yellow = partly booked, red = fully booked, grey = too soon, blue = selected
const BookingCalendar = ({ courtId, value, onChange, minDate }) => {
  const [month, setMonth] = useState((value || minDate).slice(0, 7)); // "2026-10"
  const [info, setInfo] = useState({ totalHours: 17, booked: {} });

  // Load how many hours are booked on each day of this month
  useEffect(() => {
    if (!courtId) return;
    api
      .get(`/reservations/calendar/${courtId}`, { params: { month } })
      .then((response) => setInfo(response.data))
      .catch(() => {});
  }, [courtId, month]);

  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  const moveMonth = (step) => {
    const d = new Date(year, monthNumber - 1 + step, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(<span key={`blank-${i}`} />);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${pad(day)}`;
    const booked = info.booked[date] || 0;
    let state = "free";
    if (date < minDate) state = "off";
    else if (booked >= info.totalHours) state = "full";
    else if (booked > 0) state = "part";

    cells.push(
      <button
        type="button"
        key={date}
        className={`cal-day ${state} ${date === value ? "selected" : ""}`}
        disabled={state === "off" || state === "full"}
        onClick={() => onChange(date)}
        title={state === "full" ? "Fully booked" : state === "part" ? "Partly booked" : state === "free" ? "Vacant" : "Not available"}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="calendar">
      <div className="cal-head">
        <button type="button" onClick={() => moveMonth(-1)} disabled={month <= minDate.slice(0, 7)} aria-label="Previous month">‹</button>
        <b>{monthNames[monthNumber - 1]} {year}</b>
        <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
      </div>
      <div className="cal-grid cal-weekdays">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="cal-grid">{cells}</div>
      <div className="cal-legend">
        <span><i className="free" /> Vacant</span>
        <span><i className="part" /> Partly booked</span>
        <span><i className="full" /> Fully booked</span>
        <span><i className="selected" /> Selected</span>
      </div>
    </div>
  );
};

export default BookingCalendar;
```

## 41. `client/src/components/ForgotPasswordModal.js`

```javascript
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { message } from "antd";
import AuthModal from "./AuthModal";
import FormField from "./FormField";
import PasswordChecklist from "./PasswordChecklist";
import PinInput from "./PinInput";
import api from "../api";
import { getErrorMessage } from "../tools/helpers";
import { isPasswordValid, isPin } from "../tools/validators";

// Password recovery in 2 steps:
//   Step 1 - enter your email or username. The system finds the recovery method.
//   Step 2 - customers answer their security question, staff and admin type their PIN.
//            Then everybody types a new password.
const ForgotPasswordModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [method, setMethod] = useState(""); // "question" or "pin"
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pin, setPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleFind = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/auth/forgot-password", { identifier });
      setMethod(response.data.method);
      setQuestion(response.data.securityQuestion || "");
      setStep(2);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const proofOk = method === "pin" ? isPin(pin) : answer.trim().length > 0;
  const canReset = proofOk && isPasswordValid(newPassword) && newPassword === confirm;

  const handleReset = async (e) => {
    e.preventDefault();
    if (!canReset) return;
    try {
      await api.post("/auth/reset-password", {
        identifier,
        securityAnswer: answer,
        pin,
        newPassword,
      });
      message.success("Password reset! Please log in.");
      navigate("/login");
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <AuthModal title="Forgot password" onClose={onClose}>
      {step === 1 && (
        <form onSubmit={handleFind}>
          <FormField label="Enter your email or username">
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </FormField>
          <button type="submit" className="glass-btn">Next</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleReset}>
          {method === "question" ? (
            <>
              <p className="modal-question">{question}</p>
              <FormField label="Your answer">
                <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
              </FormField>
            </>
          ) : (
            <>
              <p className="modal-question">Enter the 6-digit PIN of your account.</p>
              <PinInput value={pin} onChange={setPin} />
              <p className="modal-note">Forgot your PIN too? Ask an admin to reset it.</p>
            </>
          )}

          <FormField label="New password">
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </FormField>
          <PasswordChecklist password={newPassword} />

          <FormField
            label="Confirm new password"
            error={confirm && confirm !== newPassword ? "Passwords do not match" : ""}
          >
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </FormField>

          <button type="submit" className="glass-btn" disabled={!canReset}>Reset password</button>
        </form>
      )}

      <p className="modal-hint">
        <Link to="/login">Back to login</Link>
      </p>
    </AuthModal>
  );
};

export default ForgotPasswordModal;
```

## 42. `client/src/components/FormField.js`

```javascript
// A label, the input, and a message under it (error in red, or "ok" in green)
const FormField = ({ label, error, ok, hint, children }) => (
  <div className="field">
    <label>{label}</label>
    {children}
    {error ? (
      <div className="field-msg bad">{error}</div>
    ) : ok ? (
      <div className="field-msg good">{ok}</div>
    ) : hint ? (
      <div className="field-msg">{hint}</div>
    ) : null}
  </div>
);

export default FormField;
```

## 43. `client/src/components/HourPicker.js`

```javascript
import { hourLabel } from "../tools/helpers";

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// The hours of one day. Reserved hours are red and cannot be selected.
// Click an hour to start, click the next hour to make it longer.
// value = { start: 18, end: 20 } (hours), or null
const HourPicker = ({ openTime, closeTime, booked, value, onChange }) => {
  const firstHour = toMinutes(openTime) / 60;
  const lastHour = toMinutes(closeTime) / 60; // the last hour block ends here

  // An hour is reserved when a booked slot overlaps it
  const isReserved = (h) =>
    booked.some((slot) => toMinutes(slot.startTime) < (h + 1) * 60 && toMinutes(slot.endTime) > h * 60);

  const pick = (h) => {
    if (value && h === value.end) onChange({ start: value.start, end: h + 1 }); // make it longer
    else onChange({ start: h, end: h + 1 }); // start again from this hour
  };

  const buttons = [];
  for (let h = firstHour; h < lastHour; h++) {
    const reserved = isReserved(h);
    const selected = value && h >= value.start && h < value.end;
    buttons.push(
      <button
        type="button"
        key={h}
        disabled={reserved}
        className={`hour ${reserved ? "reserved" : selected ? "selected" : "vacant"}`}
        onClick={() => pick(h)}
      >
        {hourLabel(h)}
        <small>{reserved ? "Reserved" : selected ? "Selected" : "Vacant"}</small>
      </button>
    );
  }

  return <div className="hour-grid">{buttons}</div>;
};

export default HourPicker;
```

## 44. `client/src/components/LineChart.js`

```javascript
import { formatPeso } from "../tools/helpers";

// A simple line chart drawn with SVG (no chart library needed)
// data = [{ date: "2026-10-20", amount: 1200 }, ...]
const LineChart = ({ data }) => {
  const width = 640;
  const height = 240;
  const pad = { left: 56, right: 16, top: 16, bottom: 32 };
  const max = Math.max(...data.map((d) => d.amount), 1000);
  const top = Math.ceil(max / 1000) * 1000; // round the top of the chart up

  const x = (i) => pad.left + (data.length === 1 ? 0 : (i * (width - pad.left - pad.right)) / (data.length - 1));
  const y = (value) => pad.top + (1 - value / top) * (height - pad.top - pad.bottom);

  const points = data.map((d, i) => `${x(i)},${y(d.amount)}`).join(" ");
  const area = `${x(0)},${y(0)} ${points} ${x(data.length - 1)},${y(0)}`;
  const every = Math.ceil(data.length / 8); // show about 8 dates on the bottom

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart" role="img" aria-label="Sales over time">
      {[0, 0.5, 1].map((fraction) => (
        <g key={fraction}>
          <line x1={pad.left} x2={width - pad.right} y1={y(top * fraction)} y2={y(top * fraction)} stroke="#E2E8F0" />
          <text x={pad.left - 8} y={y(top * fraction) + 4} textAnchor="end" fontSize="11" fill="#64748B">
            {formatPeso(top * fraction)}
          </text>
        </g>
      ))}
      <polygon points={area} fill="#1769F5" opacity="0.12" />
      <polyline points={points} fill="none" stroke="#1769F5" strokeWidth="2.5" />
      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={x(i)} cy={y(d.amount)} r="3.5" fill="#1769F5">
            <title>{`${d.date}: ${formatPeso(d.amount)}`}</title>
          </circle>
          {i % every === 0 && (
            <text x={x(i)} y={height - 10} textAnchor="middle" fontSize="11" fill="#64748B">
              {d.date.slice(5)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

export default LineChart;
```

## 45. `client/src/components/LoginModal.js`

```javascript
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { message } from "antd";
import AuthModal from "./AuthModal";
import FormField from "./FormField";
import PinInput from "./PinInput";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage, homePath } from "../tools/helpers";
import { isPin } from "../tools/validators";

// Customers: email + password.
// Staff and admin: email or username + password, then a 6-digit PIN (step 2).
const LoginModal = ({ onClose, staff = false }) => {
  const { login, verifyPin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [pinToken, setPinToken] = useState(""); // set after step 1 for staff and admin
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const finish = (user, mustChangePin) => {
    message.success(`Welcome back, ${user.name}!`);
    navigate(mustChangePin ? "/set-pin" : homePath(user.role));
  };

  // Step 1
  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await login(form.identifier, form.password);
      if (data.pinRequired) setPinToken(data.pinToken);
      else finish(data.user, false);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  // Step 2 (staff and admin)
  const handlePin = async (e) => {
    e.preventDefault();
    if (!isPin(pin)) return message.error("Enter all 6 digits of your PIN");
    setBusy(true);
    try {
      const data = await verifyPin(pinToken, pin);
      finish(data.user, data.mustChangePin);
    } catch (error) {
      message.error(getErrorMessage(error));
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Step 2: PIN ----------
  if (pinToken) {
    return (
      <AuthModal title="Enter your PIN" subtitle="Type the 6-digit PIN of your account." onClose={onClose}>
        <form onSubmit={handlePin}>
          <PinInput value={pin} onChange={setPin} />
          <button type="submit" className="glass-btn" disabled={busy}>Verify PIN</button>
        </form>
        <p className="modal-hint">
          Forgot your PIN? <b>Ask an admin to reset it.</b>
        </p>
        <p className="modal-note">5 wrong attempts lock your account for 15 minutes.</p>
        <p className="modal-hint">
          <a href="#back" onClick={(e) => { e.preventDefault(); setPinToken(""); setPin(""); }}>Back</a>
        </p>
      </AuthModal>
    );
  }

  // ---------- Step 1: email/username and password ----------
  return (
    <AuthModal
      title={staff ? "Staff Login" : "Welcome Back"}
      subtitle={staff ? "Access your staff or admin dashboard." : "Log in to your account."}
      onClose={onClose}
    >
      <form onSubmit={handleLogin}>
        <FormField label="Email or username">
          <input name="identifier" placeholder="Enter your email or username" value={form.identifier} onChange={handleChange} required />
        </FormField>

        <FormField label="Password">
          <input name="password" type="password" placeholder="Enter your password" value={form.password} onChange={handleChange} required />
        </FormField>

        <div className="modal-row">
          <label className="remember"><input type="checkbox" /> Remember me</label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button type="submit" className="glass-btn" disabled={busy}>
          {staff ? "Continue" : "Login"}
        </button>
      </form>

      {!staff && (
        <p className="modal-hint">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      )}
    </AuthModal>
  );
};

export default LoginModal;
```

## 46. `client/src/components/Logo.js`

```javascript
// MetParkSports logo (text). Use dark={true} on a white background.
const Logo = ({ dark = false }) => (
  <span className={`logo ${dark ? "logo-dark" : ""}`}>
    <span className="logo-m">M</span>MetParkSports
  </span>
);

export default Logo;
```

## 47. `client/src/components/PagedTable.js`

```javascript
import { Table } from "antd";

// A table with pagination. "paged" is what usePaged() returns.
const PagedTable = ({ columns, paged }) => (
  <Table
    rowKey="_id"
    columns={columns}
    dataSource={paged.data}
    loading={paged.loading}
    scroll={{ x: true }}
    pagination={{
      current: paged.page,
      pageSize: paged.limit,
      total: paged.total,
      showSizeChanger: false,
      showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total}`,
      onChange: paged.setPage,
    }}
  />
);

export default PagedTable;
```

## 48. `client/src/components/PasswordChecklist.js`

```javascript
import { passwordRules } from "../tools/validators";

// Live checklist: each rule turns green when the password follows it
const PasswordChecklist = ({ password }) => (
  <ul className="checklist">
    {passwordRules(password).map((rule) => (
      <li key={rule.label} className={rule.ok ? "ok" : ""}>
        <span>{rule.ok ? "✓" : "○"}</span> {rule.label}
      </li>
    ))}
  </ul>
);

export default PasswordChecklist;
```

## 49. `client/src/components/PinInput.js`

```javascript
import { useRef } from "react";

// 6 boxes for a PIN. It moves to the next box while typing and accepts a pasted PIN.
const PinInput = ({ value, onChange }) => {
  const refs = useRef([]);
  const chars = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...chars];
    next[i] = digit;
    onChange(next.join(""));
    if (digit && i < 5) refs.current[i + 1].focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      const next = [...chars];
      next[i - 1] = "";
      onChange(next.join(""));
      refs.current[i - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits) {
      e.preventDefault();
      onChange(digits);
      refs.current[Math.min(digits.length, 5)].focus();
    }
  };

  return (
    <div className="pin-row">
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="pin-box"
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={char}
          aria-label={`PIN digit ${i + 1}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
};

export default PinInput;
```

## 50. `client/src/components/ProtectedRoute.js`

```javascript
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { homePath } from "../tools/helpers";

// roles = who may enter, for example roles={["staff"]}. Without roles, any logged-in user may enter.
const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  // A staff or admin with a temporary PIN must choose a new PIN first
  if (user.mustChangePin) return <Navigate to="/set-pin" />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePath(user.role)} />;

  return children;
};

export default ProtectedRoute;
```

## 51. `client/src/components/RegisterModal.js`

```javascript
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { message } from "antd";
import AuthModal from "./AuthModal";
import FormField from "./FormField";
import PasswordChecklist from "./PasswordChecklist";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage, securityQuestions } from "../tools/helpers";
import { isPasswordValid, isPhone, useEmailCheck } from "../tools/validators";

const RegisterModal = ({ onClose }) => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    securityQuestion: securityQuestions[0],
    securityAnswer: "",
  });
  const [touched, setTouched] = useState({}); // which fields the user already visited
  const [busy, setBusy] = useState(false);

  const emailState = useEmailCheck(form.email); // live "email already taken" check

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleBlur = (e) => setTouched({ ...touched, [e.target.name]: true });

  // ---------- Real-time validation: checked on every keystroke ----------
  const errors = {
    name: form.name.trim().length < 2 ? "Enter your full name" : "",
    email:
      !form.email ? "Email is required"
      : emailState === "invalid" ? "Enter a valid email address"
      : emailState === "taken" ? "This email is already registered"
      : "",
    phone: !isPhone(form.phone) ? "Use a mobile number like 09171234567" : "",
    password: isPasswordValid(form.password) ? "" : "The password must follow all the rules below",
    confirm: form.confirm !== form.password ? "Passwords do not match" : "",
    securityAnswer: form.securityAnswer.trim() ? "" : "Enter your answer",
  };
  const valid = Object.values(errors).every((e) => !e) && emailState === "available";

  // Show an error only after the user typed in the field or left it
  const show = (field) => (touched[field] || form[field] ? errors[field] : "");

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const { confirm, ...data } = form;
      await register(data);
      message.success("Account created!");
      navigate("/my-reservations");
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthModal title="Create Your Account" subtitle="Join MetParkSports and start booking now." onClose={onClose}>
      <form onSubmit={handleRegister} noValidate>
        <FormField label="Full name" error={show("name")}>
          <input name="name" placeholder="Enter your full name" value={form.name} onChange={handleChange} onBlur={handleBlur} />
        </FormField>

        <FormField
          label="Email address"
          error={show("email")}
          ok={emailState === "available" ? "Email is available" : ""}
          hint={emailState === "checking" ? "Checking..." : ""}
        >
          <input name="email" type="email" placeholder="Enter your email address" value={form.email} onChange={handleChange} onBlur={handleBlur} />
        </FormField>

        <FormField label="Phone (optional)" error={show("phone")}>
          <input name="phone" placeholder="09171234567" value={form.phone} onChange={handleChange} onBlur={handleBlur} />
        </FormField>

        <FormField label="Password" error={touched.password ? errors.password : ""}>
          <input name="password" type="password" placeholder="At least 8 characters, with special character" value={form.password} onChange={handleChange} onBlur={handleBlur} />
        </FormField>
        <PasswordChecklist password={form.password} />

        <FormField label="Confirm password" error={show("confirm")}>
          <input name="confirm" type="password" placeholder="Re-enter your password" value={form.confirm} onChange={handleChange} onBlur={handleBlur} />
        </FormField>

        <FormField label="Security question (used if you forget your password)">
          <select name="securityQuestion" value={form.securityQuestion} onChange={handleChange}>
            {securityQuestions.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Your answer" error={show("securityAnswer")}>
          <input name="securityAnswer" placeholder="Your answer" value={form.securityAnswer} onChange={handleChange} onBlur={handleBlur} />
        </FormField>

        <button type="submit" className="glass-btn" disabled={!valid || busy}>Register</button>
      </form>

      <p className="modal-hint">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </AuthModal>
  );
};

export default RegisterModal;
```

## 52. `client/src/components/RoleLayout.js`

```javascript
import { useAuth } from "../auth/AuthContext";
import SidebarLayout from "./SidebarLayout";
import SiteLayout from "./SiteLayout";

// Shared pages (like Profile): top bar for customers, sidebar for staff and admin
const RoleLayout = () => {
  const { user } = useAuth();
  return user.role === "user" ? <SiteLayout /> : <SidebarLayout />;
};

export default RoleLayout;
```

## 53. `client/src/components/SetPinModal.js`

```javascript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import AuthModal from "./AuthModal";
import PinInput from "./PinInput";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage, homePath } from "../tools/helpers";
import { isPin } from "../tools/validators";

// Shown to staff and admin who logged in with a temporary PIN: they must choose their own PIN
const SetPinModal = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isPin(pin)) return message.error("The PIN must be exactly 6 digits");
    if (pin !== confirm) return message.error("The two PINs do not match");
    try {
      await api.put("/auth/change-pin", { newPin: pin });
      updateUser({ mustChangePin: false });
      message.success("Your new PIN is saved");
      navigate(homePath(user.role));
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <AuthModal title="Choose your PIN" subtitle="Your PIN was set by an admin. Choose a new 6-digit PIN that only you know.">
      <form onSubmit={handleSave}>
        <label className="pin-label">New PIN</label>
        <PinInput value={pin} onChange={setPin} />
        <label className="pin-label">Confirm new PIN</label>
        <PinInput value={confirm} onChange={setConfirm} />
        <button type="submit" className="glass-btn">Save PIN</button>
      </form>
    </AuthModal>
  );
};

export default SetPinModal;
```

## 54. `client/src/components/SidebarLayout.js`

```javascript
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Logo from "./Logo";

// The menu of each role
const menus = {
  staff: [
    { to: "/staff/dashboard", label: "Dashboard" },
    { to: "/staff/reservations", label: "Reservations" },
    { to: "/staff/catalog", label: "Courts & Equipment" },
    { to: "/staff/archive", label: "Archive" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/monitoring", label: "Court Monitoring" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/archive", label: "Archive" },
  ],
};

// Layout of the staff and admin pages: a sidebar on the left, and the page on the right
const SidebarLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo"><Logo /></div>

        {menus[user.role].map((item) => (
          <NavLink key={item.to} to={item.to} className="side-link">
            {item.label}
          </NavLink>
        ))}

        <div className="side-spacer" />

        <div className="side-user">
          <b>{user.name}</b>
          <div>{user.role === "admin" ? "Admin" : "Staff"}</div>
          <div className="side-user-links">
            <NavLink to="/profile">Profile</NavLink>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </aside>

      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
};

export default SidebarLayout;
```

## 55. `client/src/components/SiteLayout.js`

```javascript
import { Outlet } from "react-router-dom";
import SiteNav from "./SiteNav";

// Layout of the public pages and the customer pages: a top bar and the page below it
const SiteLayout = () => (
  <div className="site">
    <SiteNav />
    <Outlet />
  </div>
);

export default SiteLayout;
```

## 56. `client/src/components/SiteNav.js`

```javascript
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { homePath } from "../tools/helpers";
import Logo from "./Logo";

// Top bar for visitors and customers. overlay = transparent bar on top of the landing photo.
const SiteNav = ({ overlay = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className={`site-nav ${overlay ? "overlay" : ""}`}>
      <Link to="/"><Logo /></Link>

      <div className="site-links">
        {/* NavLink adds the class "active" to the page you are on */}
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/courts">Courts</NavLink>
        <NavLink to="/equipment">Equipment</NavLink>
        <Link to="/#about">About</Link>
        {user && user.role === "user" && <NavLink to="/my-reservations">My Reservations</NavLink>}
      </div>

      <div className="site-actions">
        {!user && (
          <>
            <button className="btn-outline-light" onClick={() => navigate("/login")}>Login</button>
            <button className="btn-blue" onClick={() => navigate("/register")}>Sign Up</button>
          </>
        )}
        {user && user.role === "user" && (
          <>
            <NavLink to="/profile" className="site-user">{user.name}</NavLink>
            <button className="btn-outline-light" onClick={handleLogout}>Logout</button>
          </>
        )}
        {user && user.role !== "user" && (
          <>
            <button className="btn-blue" onClick={() => navigate(homePath(user.role))}>Dashboard</button>
            <button className="btn-outline-light" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default SiteNav;
```

## 57. `client/src/components/StatusPill.js`

```javascript
import { statusInfo } from "../tools/helpers";

// The colored label of a reservation status
const StatusPill = ({ reservation }) => {
  const info = statusInfo(reservation);
  return (
    <span className="pill" style={{ background: info.bg, color: info.color }}>
      {info.label}
    </span>
  );
};

export default StatusPill;
```

## 58. `client/src/pages/ArchivePage.js`

```javascript
import { useState } from "react";
import { Popconfirm, Tabs, message } from "antd";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import usePaged from "../tools/usePaged";
import PagedTable from "../components/PagedTable";
import { formatDate, formatPeso, getErrorMessage, statusInfo } from "../tools/helpers";

const when = (d) => (d ? new Date(d).toLocaleDateString() : "");

// Archive: records that are no longer active but are kept. Used by staff and by admin.
//   staff -> reservations, courts, equipment (they can restore and delete)
//   admin -> the same three tabs (view only) and the users tab (restore and delete)
const ArchivePage = () => {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [type, setType] = useState("reservations");
  const paged = usePaged(`/archive/${type}`, {});

  // Who may restore and delete in this tab
  const canManage = type === "users" ? isAdmin : !isAdmin;

  const call = async (request, success) => {
    try {
      await request();
      message.success(success);
      paged.refresh();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const details = {
    reservations: [
      { title: "Ref.", dataIndex: "refNo" },
      { title: "Customer", render: (_, r) => r.user?.name || "(deleted user)" },
      { title: "Court", render: (_, r) => r.court?.name || "(deleted court)" },
      { title: "Date", render: (_, r) => formatDate(r.date) },
      { title: "Total", render: (_, r) => formatPeso(r.totalPrice) },
      { title: "Status", render: (_, r) => statusInfo(r).label },
    ],
    courts: [
      { title: "Name", dataIndex: "name" },
      { title: "Sport", dataIndex: "sport" },
      { title: "Rate", render: (_, c) => formatPeso(c.hourlyRate) },
    ],
    equipment: [
      { title: "Name", dataIndex: "name" },
      { title: "Sport", dataIndex: "sport" },
      { title: "Price per hour", render: (_, e) => formatPeso(e.pricePerHour) },
    ],
    users: [
      { title: "Name", dataIndex: "name" },
      { title: "Email", dataIndex: "email" },
      { title: "Role", dataIndex: "role" },
    ],
  };

  const columns = [
    ...details[type],
    { title: "Archived on", render: (_, r) => when(r.archivedAt) },
    {
      title: "Actions",
      render: (_, r) =>
        canManage ? (
          <div className="row-actions">
            <button className="btn-blue small" onClick={() => call(() => api.put(`/archive/${type}/${r._id}/restore`), "Record restored")}>
              Restore
            </button>
            <Popconfirm title="Delete permanently? This cannot be undone." onConfirm={() => call(() => api.delete(`/archive/${type}/${r._id}`), "Record deleted permanently")}>
              <button className="btn-line small danger">Delete</button>
            </Popconfirm>
          </div>
        ) : (
          <span className="muted small">View only</span>
        ),
    },
  ];

  const tabs = [
    { key: "reservations", label: "Reservations" },
    { key: "courts", label: "Courts" },
    { key: "equipment", label: "Equipment" },
    ...(isAdmin ? [{ key: "users", label: "Users" }] : []),
  ];

  return (
    <div className="page-pad">
      <h1 className="page-title">Archive</h1>
      <p className="muted">
        Archived records are no longer active but are kept.{" "}
        {isAdmin ? "Admin can restore users. The other tabs are view only." : "You can restore them at any time."}
      </p>
      <Tabs activeKey={type} onChange={setType} items={tabs} />
      <div className="panel flush">
        <PagedTable columns={columns} paged={paged} />
      </div>
    </div>
  );
};

export default ArchivePage;
```

## 59. `client/src/pages/Book.js`

```javascript
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { message } from "antd";
import api from "../api";
import useRules from "../tools/useRules";
import BookingCalendar from "../components/BookingCalendar";
import HourPicker from "../components/HourPicker";
import FormField from "../components/FormField";
import { addDaysString, formatDate, formatPeso, getErrorMessage, hourLabel } from "../tools/helpers";
import { isReference } from "../tools/validators";

const pad = (n) => String(n).padStart(2, "0");
const steps = ["Court", "Equipment", "Price Summary", "Payment"];

// The booking flow: 1 Court -> 2 Equipment -> 3 Price Summary -> 4 Payment -> 5 Submitted
const Book = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rules = useRules();
  const minDate = addDaysString(rules.advanceBookingDays);

  const [step, setStep] = useState(1);
  const [courts, setCourts] = useState([]);
  const [equipment, setEquipment] = useState([]);

  // Step 1
  const [sport, setSport] = useState("");
  const [courtId, setCourtId] = useState("");
  const [date, setDate] = useState("");
  const [booked, setBooked] = useState([]); // reserved slots of the chosen day
  const [hours, setHours] = useState(null); // { start, end }
  const [players, setPlayers] = useState(1);
  // Step 2
  const [equipmentId, setEquipmentId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState([]); // [{ equipment, quantity }]
  // Step 3
  const [option, setOption] = useState("downpayment");
  const [notes, setNotes] = useState("");
  // Step 4
  const [method, setMethod] = useState("GCash");
  const [reference, setReference] = useState("");
  const [referenceTouched, setReferenceTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  // Step 5
  const [done, setDone] = useState(null);

  // Load the courts and the equipment
  useEffect(() => {
    Promise.all([api.get("/courts"), api.get("/equipment")])
      .then(([courtsResponse, equipmentResponse]) => {
        const list = courtsResponse.data;
        setCourts(list);
        setEquipment(equipmentResponse.data.filter((e) => e.status === "available" && e.stock > 0));
        const wanted = list.find((c) => c._id === searchParams.get("courtId"));
        const first = wanted || list.find((c) => c.status === "available");
        if (first) {
          setSport(first.sport);
          setCourtId(first._id);
        }
      })
      .catch((error) => message.error(getErrorMessage(error)));
  }, [searchParams]);

  const court = courts.find((c) => c._id === courtId);
  const sportList = [...new Set(courts.map((c) => c.sport))];
  const courtsOfSport = courts.filter((c) => c.sport === sport && c.status === "available");
  const equipmentOfSport = equipment.filter((e) => e.sport === sport || e.sport === "All");

  // Reload the reserved hours when the court or the day changes
  useEffect(() => {
    if (!courtId || !date) return setBooked([]);
    api
      .get(`/reservations/availability/${courtId}`, { params: { date } })
      .then((response) => setBooked(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, [courtId, date]);

  const changeSport = (e) => {
    const newSport = e.target.value;
    const first = courts.find((c) => c.sport === newSport && c.status === "available");
    setSport(newSport);
    setCourtId(first ? first._id : "");
    setHours(null);
    setAdded([]);
    setEquipmentId("");
  };

  const changeCourt = (e) => {
    setCourtId(e.target.value);
    setHours(null);
  };

  // ---------- Prices (the server calculates them again to be safe) ----------
  const hoursCount = hours ? hours.end - hours.start : 0;
  const courtFee = court ? hoursCount * court.hourlyRate : 0;
  const lines = added.map((a) => ({ ...a, fee: a.equipment.pricePerHour * hoursCount * a.quantity }));
  const equipmentFee = lines.reduce((sum, l) => sum + l.fee, 0);
  const doorCharge = (parseInt(players) || 0) * rules.doorChargePerHead;
  const total = courtFee + equipmentFee + doorCharge;
  const payNow = option === "full" ? total : Math.ceil((total * rules.downpaymentPercent) / 100);

  const addEquipment = () => {
    const item = equipment.find((e) => e._id === equipmentId);
    const qty = parseInt(quantity);
    if (!item || !qty || qty < 1) return message.error("Choose the equipment and the quantity");
    if (qty > item.stock) return message.error(`We only have ${item.stock} ${item.name}`);
    const existing = added.find((a) => a.equipment._id === item._id);
    if (existing) {
      setAdded(added.map((a) => (a.equipment._id === item._id ? { ...a, quantity: Math.min(a.quantity + qty, item.stock) } : a)));
    } else {
      setAdded([...added, { equipment: item, quantity: qty }]);
    }
    setEquipmentId("");
    setQuantity(1);
  };

  const step1Ok = court && date && hours && parseInt(players) >= 1;
  const counter = method === "Pay at the counter";
  const referenceError = !counter && !isReference(reference) ? "Use 6-30 letters, numbers or dashes" : "";

  const submit = async () => {
    setBusy(true);
    try {
      const response = await api.post("/reservations", {
        courtId,
        date,
        startTime: `${pad(hours.start)}:00`,
        endTime: `${pad(hours.end)}:00`,
        players,
        notes,
        equipment: added.map((a) => ({ equipmentId: a.equipment._id, quantity: a.quantity })),
        paymentOption: option,
        paymentMethod: method,
        paymentReference: reference,
      });
      setDone(response.data);
      setStep(5);
      window.scrollTo({ top: 0 });
    } catch (error) {
      message.error(getErrorMessage(error));
      // The slot may have been taken by someone else: go back to the calendar
      if (error.response?.status === 409) setStep(1);
    } finally {
      setBusy(false);
    }
  };

  if (courts.length === 0) return <div className="page-pad"><p>Loading...</p></div>;

  // ---------- Step 5: submitted ----------
  if (step === 5 && done) {
    return (
      <div className="page-pad">
        <div className="done-card">
          <div className="done-check">✓</div>
          <h1>Reservation submitted</h1>
          <span className="pill" style={{ background: counter ? "#FDE9E7" : "#FFF1D6", color: counter ? "#9B2A1B" : "#8A4B00" }}>
            {counter ? "Awaiting payment" : "Pending verification"}
          </span>
          <p className="muted">
            {counter
              ? `Please pay at the counter within ${rules.unpaidExpiryHours} hours, or the slot is released.`
              : "Staff will verify your payment shortly. You can follow the status in My Reservations."}
          </p>

          <div className="tracker">
            {["Submitted", "Verification", "Confirmed", "Completed"].map((label, i) => (
              <div key={label} className={i === 0 ? "done" : i === 1 ? "now" : ""}><span>{i === 0 ? "✓" : ""}</span>{label}</div>
            ))}
          </div>

          <div className="kv"><span>Reservation no.</span><b>{done.refNo}</b></div>
          <div className="kv"><span>Court</span><b>{done.court.name}</b></div>
          <div className="kv"><span>Date</span><b>{formatDate(done.date)}</b></div>
          <div className="kv"><span>Time</span><b>{hourLabel(hours.start)} - {hourLabel(hours.end)}</b></div>
          <div className="kv"><span>People</span><b>{done.players}</b></div>
          {done.equipment.length > 0 && (
            <div className="kv"><span>Equipment</span><b>{done.equipment.map((e) => `${e.name} × ${e.quantity}`).join(", ")}</b></div>
          )}

          <div className="sum-box">
            <div className="kv"><span>Total</span><b>{formatPeso(done.totalPrice)}</b></div>
            <div className="kv"><span>To pay now ({done.paymentOption === "full" ? "full payment" : `${rules.downpaymentPercent}% downpayment`})</span><b>{formatPeso(done.paymentDeclared)}</b></div>
            <div className="kv"><span>Balance, paid at the venue on your game day</span><b>{formatPeso(done.totalPrice - done.paymentDeclared)}</b></div>
          </div>

          <p className="info-box">
            Cancel at least {rules.refundDaysBefore} days before your game to get your payment back.
            Reservations without a payment are released after {rules.unpaidExpiryHours} hours.
          </p>

          <div className="center-buttons">
            <button className="btn-blue" onClick={() => navigate("/my-reservations")}>Go to My Reservations</button>
            <button className="btn-line" onClick={() => window.location.assign("/book")}>Book another court</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-pad">
      <h1 className="page-title">Book a Court</h1>

      {/* Steps */}
      <div className="stepper">
        {steps.map((label, i) => (
          <div key={label} className={`step ${i + 1 < step ? "done" : i + 1 === step ? "now" : ""}`}>
            <span>{i + 1 < step ? "✓" : i + 1}</span>{label}
          </div>
        ))}
      </div>

      {/* ---------- Step 1: court, day, hours ---------- */}
      {step === 1 && (
        <div className="two-col">
          <div className="panel">
            <div className="row2">
              <FormField label="Type of court">
                <select value={sport} onChange={changeSport}>
                  {sportList.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Court">
                <select value={courtId} onChange={changeCourt}>
                  {courtsOfSport.length === 0 && <option value="">No court available</option>}
                  {courtsOfSport.map((c) => <option key={c._id} value={c._id}>{c.name} ({formatPeso(c.hourlyRate)}/hr)</option>)}
                </select>
              </FormField>
            </div>

            <label className="label">Date (at least {rules.advanceBookingDays} days from today)</label>
            <BookingCalendar courtId={courtId} value={date} minDate={minDate} onChange={(d) => { setDate(d); setHours(null); }} />
          </div>

          <div className="panel">
            <b>Time slot</b>
            {!date || !court ? (
              <p className="muted">{court ? "Choose a date on the calendar first." : "Choose a court that is available first."}</p>
            ) : (
              <>
                <p className="muted">{formatDate(date)}. Click an hour, then click the next hour to book longer.</p>
                <HourPicker openTime={court.openTime} closeTime={court.closeTime} booked={booked} value={hours} onChange={setHours} />
              </>
            )}

            <FormField
              label="Number of people (players + non-players)"
              error={parseInt(players) >= 1 && parseInt(players) <= 100 ? "" : "Enter a number from 1 to 100"}
            >
              <input type="number" min="1" max="100" value={players} onChange={(e) => setPlayers(e.target.value)} />
            </FormField>
          </div>
        </div>
      )}

      {/* ---------- Step 2: equipment ---------- */}
      {step === 2 && (
        <div className="two-col">
          <div className="panel">
            <h3>Add equipment</h3>
            <p className="muted">Optional. Rent what you need for your game.</p>
            <div className="eq-row">
              <FormField label="Equipment">
                <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
                  <option value="">Select equipment</option>
                  {equipmentOfSport.map((e) => (
                    <option key={e._id} value={e._id}>{e.name} - {formatPeso(e.pricePerHour)}/hr</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Quantity">
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </FormField>
              <button className="btn-blue" onClick={addEquipment}>Add</button>
            </div>

            <b className="block">Added equipment</b>
            {added.length === 0 && <p className="muted">Nothing added yet.</p>}
            {lines.map((l) => (
              <div className="line" key={l.equipment._id}>
                <span>{l.equipment.name} × {l.quantity} ({hoursCount} hr)</span>
                <span>
                  <b>{formatPeso(l.fee)}</b>
                  <button className="link-red" onClick={() => setAdded(added.filter((a) => a.equipment._id !== l.equipment._id))}>Remove</button>
                </span>
              </div>
            ))}
          </div>
          <SummaryCard court={court} date={date} hours={hours} players={players} courtFee={courtFee} equipmentFee={equipmentFee} doorCharge={doorCharge} total={total} rules={rules} />
        </div>
      )}

      {/* ---------- Step 3: price summary ---------- */}
      {step === 3 && (
        <div className="two-col">
          <div className="panel">
            <h3>Price summary</h3>
            <div className="kv"><span>{court.name} ({hoursCount} hr × {formatPeso(court.hourlyRate)})</span><b>{formatPeso(courtFee)}</b></div>
            {lines.map((l) => (
              <div className="kv" key={l.equipment._id}><span>{l.equipment.name} × {l.quantity}</span><b>{formatPeso(l.fee)}</b></div>
            ))}
            <div className="kv"><span>Door charge ({parseInt(players) || 0} × {formatPeso(rules.doorChargePerHead)})</span><b>{formatPeso(doorCharge)}</b></div>
            <div className="kv total"><span>Total</span><b>{formatPeso(total)}</b></div>

            <FormField label="How much do you want to pay now?">
              <select value={option} onChange={(e) => setOption(e.target.value)}>
                <option value="downpayment">{rules.downpaymentPercent}% downpayment - {formatPeso(Math.ceil((total * rules.downpaymentPercent) / 100))}</option>
                <option value="full">Pay in full - {formatPeso(total)}</option>
              </select>
            </FormField>
            <FormField label="Notes (optional)">
              <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
            <p className="info-box">
              You are required to pay at least {rules.downpaymentPercent}% of the total amount.
              The balance is paid at the venue on your game day.
            </p>
          </div>
          <SummaryCard court={court} date={date} hours={hours} players={players} courtFee={courtFee} equipmentFee={equipmentFee} doorCharge={doorCharge} total={total} rules={rules} />
        </div>
      )}

      {/* ---------- Step 4: payment ---------- */}
      {step === 4 && (
        <div className="two-col">
          <div className="panel">
            <h3>Payment</h3>
            <div className="pay-now">Amount to pay now <b>{formatPeso(payNow)}</b></div>

            <FormField label="Payment method">
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {rules.paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>

            {counter ? (
              <p className="info-box warn">
                Pay at the counter within {rules.unpaidExpiryHours} hours. If there is no payment by then, the reservation is released.
              </p>
            ) : (
              <FormField
                label="Reference number"
                error={referenceTouched ? referenceError : ""}
                ok={reference && !referenceError ? "Valid reference number" : ""}
                hint="Send the payment first, then type the reference number of your receipt."
              >
                <input
                  value={reference}
                  placeholder="Enter reference number"
                  onChange={(e) => setReference(e.target.value)}
                  onBlur={() => setReferenceTouched(true)}
                />
              </FormField>
            )}
          </div>
          <SummaryCard court={court} date={date} hours={hours} players={players} courtFee={courtFee} equipmentFee={equipmentFee} doorCharge={doorCharge} total={total} rules={rules} />
        </div>
      )}

      {/* ---------- Back / Next ---------- */}
      <div className="step-buttons">
        {step > 1 ? <button className="btn-line" onClick={() => setStep(step - 1)}>Back</button> : <Link to="/courts" className="btn-line">Cancel</Link>}
        {step < 4 && (
          <button className="btn-blue" disabled={step === 1 && !step1Ok} onClick={() => setStep(step + 1)}>
            Next: {steps[step]}
          </button>
        )}
        {step === 4 && (
          <button className="btn-blue" disabled={busy || (!counter && !!referenceError)} onClick={submit}>
            {busy ? "Submitting..." : "Submit reservation"}
          </button>
        )}
      </div>
    </div>
  );
};

// The side card that shows the reservation and the price while the customer goes through the steps
const SummaryCard = ({ court, date, hours, players, courtFee, equipmentFee, doorCharge, total, rules }) => (
  <div className="panel summary">
    <h3>Your reservation</h3>
    <div className="kv"><span>Court</span><b>{court ? court.name : "-"}</b></div>
    <div className="kv"><span>Date</span><b>{date ? formatDate(date) : "-"}</b></div>
    <div className="kv"><span>Time</span><b>{hours ? `${hourLabel(hours.start)} - ${hourLabel(hours.end)}` : "-"}</b></div>
    <div className="kv"><span>People</span><b>{parseInt(players) || 0}</b></div>
    <hr />
    <div className="kv"><span>Court fee</span><b>{formatPeso(courtFee)}</b></div>
    <div className="kv"><span>Equipment</span><b>{formatPeso(equipmentFee)}</b></div>
    <div className="kv"><span>Door charge ({formatPeso(rules.doorChargePerHead)} per head)</span><b>{formatPeso(doorCharge)}</b></div>
    <div className="kv total"><span>Total</span><b>{formatPeso(total)}</b></div>
  </div>
);

export default Book;
```

## 60. `client/src/pages/Courts.js`

```javascript
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Modal, message } from "antd";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { formatPeso, formatTime, getErrorMessage, sportColors, sports } from "../tools/helpers";

const courtImage = `${process.env.PUBLIC_URL}/images/court.jpg`;
const heroImage = `${process.env.PUBLIC_URL}/images/hero.jpg`;

// Browse the courts (anyone can look; booking needs a login)
const Courts = () => {
  const [searchParams] = useSearchParams();
  const [courts, setCourts] = useState([]);
  const [sport, setSport] = useState(searchParams.get("sport") || "All");
  const [details, setDetails] = useState(null); // the court shown in the pop-up
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/courts")
      .then((response) => setCourts(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, []);

  const visible = sport === "All" ? courts : courts.filter((c) => c.sport === sport);

  const bookCourt = (court) => {
    if (!user) return navigate("/login");
    if (user.role !== "user") return message.info("Only customers can book a court.");
    navigate(`/book?courtId=${court._id}`);
  };

  return (
    <div>
      <div className="banner" style={{ backgroundImage: `linear-gradient(rgba(7,22,48,0.6), rgba(7,22,48,0.85)), url(${heroImage})` }}>
        <h1>Book Your Court</h1>
        <p>Choose from our available courts and equipment.</p>
      </div>

      <div className="browse">
        {/* Filter */}
        <aside className="filter-card">
          <b>Sport</b>
          {["All", ...sports].map((s) => (
            <label key={s} className="radio">
              <input type="radio" name="sport" checked={sport === s} onChange={() => setSport(s)} /> {s}
            </label>
          ))}
        </aside>

        {/* Cards */}
        <div className="browse-grid">
          {visible.length === 0 && <p>No courts found.</p>}
          {visible.map((court) => (
            <div className="item-card" key={court._id}>
              <div
                className="item-photo"
                style={{ backgroundImage: `linear-gradient(transparent 40%, ${sportColors[court.sport] || "#12335b"}cc), url(${courtImage})` }}
              >
                <span>{court.sport}</span>
              </div>
              <div className="item-body">
                <h3>{court.name}</h3>
                <p className="item-price">{formatPeso(court.hourlyRate)} <small>/ hr</small></p>
                {court.status === "maintenance" && <p className="item-warn">Under maintenance</p>}
                <div className="item-buttons">
                  <button className="btn-blue" disabled={court.status !== "available"} onClick={() => bookCourt(court)}>
                    Book Now
                  </button>
                  <button className="btn-line" onClick={() => setDetails(court)}>View Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!details} onCancel={() => setDetails(null)} footer={null} title={details?.name}>
        {details && (
          <div className="details">
            <p><b>Sport:</b> {details.sport}</p>
            <p><b>Location:</b> {details.location}</p>
            <p><b>Hours:</b> {formatTime(details.openTime)} - {formatTime(details.closeTime)}</p>
            <p><b>Rate:</b> {formatPeso(details.hourlyRate)} per hour</p>
            {details.description && <p>{details.description}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Courts;
```

## 61. `client/src/pages/Equipment.js`

```javascript
import { useState, useEffect } from "react";
import { message } from "antd";
import api from "../api";
import { formatPeso, getErrorMessage, sports } from "../tools/helpers";

const heroImage = `${process.env.PUBLIC_URL}/images/hero.jpg`;

// The equipment that can be rented with a court. Customers add it while booking.
const Equipment = () => {
  const [items, setItems] = useState([]);
  const [sport, setSport] = useState("All");

  useEffect(() => {
    api
      .get("/equipment")
      .then((response) => setItems(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, []);

  const visible = sport === "All" ? items : items.filter((i) => i.sport === sport || i.sport === "All");

  return (
    <div>
      <div className="banner" style={{ backgroundImage: `linear-gradient(rgba(7,22,48,0.6), rgba(7,22,48,0.85)), url(${heroImage})` }}>
        <h1>Equipment</h1>
        <p>Rent what you need for your game. You can add equipment when you book a court.</p>
      </div>

      <div className="browse">
        <aside className="filter-card">
          <b>Sport</b>
          {["All", ...sports].map((s) => (
            <label key={s} className="radio">
              <input type="radio" name="sport" checked={sport === s} onChange={() => setSport(s)} /> {s}
            </label>
          ))}
        </aside>

        <div className="browse-grid">
          {visible.length === 0 && <p>No equipment found.</p>}
          {visible.map((item) => (
            <div className="item-card" key={item._id}>
              <div className="item-body">
                <span className="tag">{item.sport === "All" ? "All sports" : item.sport}</span>
                <h3>{item.name}</h3>
                <p className="item-price">{formatPeso(item.pricePerHour)} <small>/ hour</small></p>
                <p className="muted">{item.description}</p>
                <p className="muted">{item.status === "available" ? `${item.stock} in stock` : "Not available"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Equipment;
```

## 62. `client/src/pages/Landing.js`

```javascript
import { useEffect } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import SiteNav from "../components/SiteNav";
import Logo from "../components/Logo";
import LoginModal from "../components/LoginModal";
import RegisterModal from "../components/RegisterModal";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import SetPinModal from "../components/SetPinModal";
import { sportColors } from "../tools/helpers";

// Pictures are in public/images (hero.jpg and court.jpg)
const heroImage = `${process.env.PUBLIC_URL}/images/hero.jpg`;
const courtImage = `${process.env.PUBLIC_URL}/images/court.jpg`;

const arenas = ["Basketball", "Volleyball", "Badminton", "Pickleball"];

const features = [
  { title: "Easy Booking", text: "Quick and simple reservation process." },
  { title: "Quality Facilities", text: "Well-maintained courts and equipment." },
  { title: "Secure Payments", text: "Pay a 50% downpayment, verified by our staff." },
  { title: "Flexible Schedules", text: "Pick your hours on the calendar. Open 7:00 AM to 12:00 midnight." },
];

// modal = "login" | "register" | "forgot" | "staff" | "setpin" | null  (comes from the route)
const Landing = ({ modal = null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // The "About" link of the top bar is /#about
  useEffect(() => {
    if (location.hash) {
      const section = document.getElementById(location.hash.slice(1));
      if (section) section.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  // The Set PIN pop-up is only for a logged-in staff or admin with a temporary PIN
  if (modal === "setpin" && (!user || !user.mustChangePin)) return <Navigate to="/" />;

  const closeModal = () => navigate("/");

  // Visitors log in first. Customers go to the booking page.
  const handleBookNow = () => {
    if (!user) return navigate("/login");
    navigate(user.role === "user" ? "/book" : "/courts");
  };

  const heroStyle = {
    backgroundImage: `linear-gradient(rgba(7,22,48,0.55), rgba(7,22,48,0.85)), url(${heroImage})`,
  };

  return (
    <div className="landing">
      {/* ---------- Hero ---------- */}
      <header className="hero" style={heroStyle}>
        <SiteNav overlay />
        <div className="hero-copy">
          <h1>
            Play More.<br />Book Faster.<br />
            <span>MetParkSports.</span>
          </h1>
          <p>Reserve your court, rent equipment, and enjoy your favorite sports, all in one place.</p>
          <div className="hero-buttons">
            <button className="btn-blue big" onClick={handleBookNow}>Book Now</button>
            <button className="btn-outline-light big" onClick={() => document.getElementById("arena").scrollIntoView({ behavior: "smooth" })}>
              Learn More
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Choose your arena ---------- */}
      <section id="arena" className="section">
        <h2>Choose Your Arena</h2>
        <p className="section-sub">World-class courts and facilities for every sport.</p>
        <div className="arena-grid">
          {arenas.map((sport) => (
            <Link
              key={sport}
              to={`/courts?sport=${sport}`}
              className="arena-card"
              style={{ backgroundImage: `linear-gradient(transparent 30%, ${sportColors[sport]}ee), url(${courtImage})` }}
            >
              <b>{sport}</b>
              <span>Book Now →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Why MetParkSports ---------- */}
      <section className="section alt">
        <h2>Why MetParkSports?</h2>
        <div className="feature-grid">
          {features.map((f) => (
            <div className="feature" key={f.title}>
              <div className="feature-icon" />
              <b>{f.title}</b>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- About ---------- */}
      <section id="about" className="section about">
        <img src={courtImage} alt="MET Park indoor court" />
        <div>
          <h2>Introducing MET Park Pasay</h2>
          <p>
            Met Park is a modern mixed-use development located in Pasay City, Metro Manila.
            Designed to bring together residential spaces, business establishments, shopping
            destinations, and leisure experiences, Met Park offers a vibrant environment where
            people can live, work, and connect. It is a 36-hectare master-planned development by
            Federal Land, Inc., located in the Bay Area of Pasay City.
          </p>
          <p>
            <b>Address:</b> Metrobank Ave., Met Park, Pasay City 1308<br />
            <b>Open:</b> 7:00 AM to 12:00 midnight
          </p>
        </div>
      </section>

      {/* ---------- Ready to play ---------- */}
      <section className="cta" style={heroStyle}>
        <h2>Ready to Play?</h2>
        <p>Your next game is just a few clicks away.</p>
        <button className="btn-blue big" onClick={handleBookNow}>Book Now</button>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <Logo />
            <p className="footer-tag">Play More. Book Faster.</p>
          </div>
          <div>
            <b>Quick Links</b>
            <Link to="/">Home</Link>
            <Link to="/courts">Courts</Link>
            <Link to="/equipment">Equipment</Link>
            <Link to="/#about">About</Link>
          </div>
          <div>
            <b>Follow Us</b>
            <a href="https://metpark.ph/" target="_blank" rel="noreferrer">metpark.ph</a>
            <a href="https://www.facebook.com/metparksportscenter/" target="_blank" rel="noreferrer">Facebook</a>
            <a href="https://www.instagram.com/metparksportscenter" target="_blank" rel="noreferrer">Instagram</a>
            <Link to="/staff-login" className="staff-link">Staff login</Link>
          </div>
        </div>
        <div className="footer-note">
          © 2026 MetParkSports. All rights reserved. Student project. MET Park Sports Center is
          used only as a sample target client and is not affiliated with this project.
        </div>
      </footer>

      {/* ---------- Glass pop-ups ---------- */}
      {modal === "login" && <LoginModal onClose={closeModal} />}
      {modal === "staff" && <LoginModal onClose={closeModal} staff />}
      {modal === "register" && <RegisterModal onClose={closeModal} />}
      {modal === "forgot" && <ForgotPasswordModal onClose={closeModal} />}
      {modal === "setpin" && <SetPinModal />}
    </div>
  );
};

export default Landing;
```

## 63. `client/src/pages/MyReservations.js`

```javascript
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Modal, message } from "antd";
import api from "../api";
import useRules from "../tools/useRules";
import usePaged from "../tools/usePaged";
import PagedTable from "../components/PagedTable";
import StatusPill from "../components/StatusPill";
import FormField from "../components/FormField";
import { addDaysString, formatDate, formatPeso, formatTime, getErrorMessage, paymentLabel } from "../tools/helpers";
import { isReference } from "../tools/validators";

// How long is left to pay before the reservation is released
const timeLeft = (r) => {
  const ms = new Date(r.expiresAt) - Date.now();
  if (ms <= 0) return "Expiring now";
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

const MyReservations = () => {
  const rules = useRules();
  const [status, setStatus] = useState("");
  const paged = usePaged("/reservations/my", { status });

  const [payFor, setPayFor] = useState(null); // the reservation being paid
  const [pay, setPay] = useState({ paymentOption: "downpayment", paymentMethod: "GCash", paymentReference: "" });

  // Refresh the countdown every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // ---------- Cancel ----------
  const refundText = (r) => {
    if (r.amountPaid <= 0) return "No payment was made, so there is nothing to refund.";
    const daysBefore = Math.round((new Date(`${r.date}T00:00:00`) - new Date(`${addDaysString(0)}T00:00:00`)) / 86400000);
    return daysBefore >= rules.refundDaysBefore
      ? `You will get your payment of ${formatPeso(r.amountPaid)} back.`
      : `There is no refund, because it is less than ${rules.refundDaysBefore} days before your game.`;
  };

  const confirmCancel = (r) => {
    Modal.confirm({
      title: `Cancel ${r.refNo}?`,
      content: refundText(r),
      okText: "Yes, cancel it",
      cancelText: "Keep it",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await api.put(`/reservations/${r._id}/cancel`);
          message.success(response.data.message);
          paged.refresh();
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  // ---------- Pay now (for reservations that still wait for a payment) ----------
  const referenceError = isReference(pay.paymentReference) ? "" : "Use 6-30 letters, numbers or dashes";

  const submitPay = async () => {
    try {
      await api.put(`/reservations/${payFor._id}/pay`, pay);
      message.success("Payment submitted. Staff will verify it.");
      setPayFor(null);
      setPay({ ...pay, paymentReference: "" });
      paged.refresh();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const columns = [
    { title: "Ref.", dataIndex: "refNo", render: (v) => <b>{v}</b> },
    { title: "Court", render: (_, r) => r.court?.name || "(deleted court)" },
    { title: "Date & time", render: (_, r) => `${formatDate(r.date)} · ${formatTime(r.startTime)}` },
    { title: "Total", dataIndex: "totalPrice", render: (v) => formatPeso(v) },
    { title: "Paid", dataIndex: "amountPaid", render: (v) => formatPeso(v) },
    {
      title: "Status",
      render: (_, r) => (
        <div>
          <StatusPill reservation={r} />
          <div className="muted small">{paymentLabel[r.paymentStatus]}</div>
          {r.paymentNote && r.status === "pending" && <div className="field-msg bad">{r.paymentNote}</div>}
        </div>
      ),
    },
    {
      title: "Pay within",
      render: (_, r) => (r.status === "pending" && !r.paymentSubmitted ? <b>{timeLeft(r)}</b> : "-"),
    },
    {
      title: "Actions",
      render: (_, r) => (
        <div className="row-actions">
          {r.status === "pending" && !r.paymentSubmitted && (
            <button className="btn-blue small" onClick={() => setPayFor(r)}>Pay now</button>
          )}
          {["pending", "confirmed"].includes(r.status) && (
            <button className="btn-line small danger" onClick={() => confirmCancel(r)}>Cancel</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">My Reservations</h1>
          <p className="muted">Follow your bookings, pay, or cancel them here.</p>
        </div>
        <Link to="/book" className="btn-blue">Book a Court</Link>
      </div>

      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="panel flush">
        <PagedTable columns={columns} paged={paged} />
      </div>

      <Modal
        open={!!payFor}
        title={payFor ? `Pay for ${payFor.refNo}` : ""}
        onCancel={() => setPayFor(null)}
        onOk={submitPay}
        okText="Submit payment"
        okButtonProps={{ disabled: !!referenceError }}
      >
        {payFor && (
          <div>
            <p>Total: <b>{formatPeso(payFor.totalPrice)}</b></p>
            <FormField label="How much do you want to pay now?">
              <select value={pay.paymentOption} onChange={(e) => setPay({ ...pay, paymentOption: e.target.value })}>
                <option value="downpayment">{rules.downpaymentPercent}% downpayment - {formatPeso(Math.ceil((payFor.totalPrice * rules.downpaymentPercent) / 100))}</option>
                <option value="full">Pay in full - {formatPeso(payFor.totalPrice)}</option>
              </select>
            </FormField>
            <FormField label="Payment method">
              <select value={pay.paymentMethod} onChange={(e) => setPay({ ...pay, paymentMethod: e.target.value })}>
                {rules.paymentMethods.filter((m) => m !== "Pay at the counter").map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField
              label="Reference number"
              error={pay.paymentReference ? referenceError : ""}
              ok={pay.paymentReference && !referenceError ? "Valid reference number" : ""}
            >
              <input value={pay.paymentReference} onChange={(e) => setPay({ ...pay, paymentReference: e.target.value })} />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyReservations;
```

## 64. `client/src/pages/Profile.js`

```javascript
import { useState, useEffect } from "react";
import { message } from "antd";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import FormField from "../components/FormField";
import PasswordChecklist from "../components/PasswordChecklist";
import PinInput from "../components/PinInput";
import { getErrorMessage, securityQuestions } from "../tools/helpers";
import { isPasswordValid, isPhone, isPin } from "../tools/validators";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState({ name: "", phone: "", securityQuestion: securityQuestions[0], securityAnswer: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pins, setPins] = useState({ currentPin: "", newPin: "" });

  useEffect(() => {
    api
      .get("/auth/me")
      .then((response) => {
        const data = response.data;
        setAccount(data);
        setProfile({
          name: data.name,
          phone: data.phone || "",
          securityQuestion: data.securityQuestion || securityQuestions[0],
          securityAnswer: "",
        });
      })
      .catch((error) => message.error(getErrorMessage(error)));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put("/auth/profile", profile);
      setAccount(response.data);
      updateUser({ name: response.data.name });
      setProfile({ ...profile, securityAnswer: "" });
      message.success("Profile updated");
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/change-password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      message.success("Password changed");
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const savePin = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/change-pin", pins);
      message.success("PIN changed");
      setPins({ currentPin: "", newPin: "" });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  if (!account) return <div className="page-pad"><p>Loading...</p></div>;

  const isCustomer = user.role === "user";
  const passwordOk = isPasswordValid(passwords.newPassword) && passwords.newPassword === passwords.confirm && passwords.currentPassword;

  return (
    <div className="page-pad narrow">
      <h1 className="page-title">My Profile</h1>

      <div className="panel">
        <h3>Account information</h3>
        <div className="kv"><span>Email</span><b>{account.email}</b></div>
        {account.username && <div className="kv"><span>Username</span><b>{account.username}</b></div>}
        <div className="kv"><span>Role</span><b>{account.role === "user" ? "Customer" : account.role === "staff" ? "Staff" : "Admin"}</b></div>
        <div className="kv"><span>Member since</span><b>{new Date(account.createdAt).toLocaleDateString()}</b></div>
      </div>

      <form className="panel" onSubmit={saveProfile}>
        <h3>Edit profile</h3>
        <FormField label="Full name" error={profile.name.trim().length < 2 ? "Enter your full name" : ""}>
          <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        </FormField>
        <FormField label="Phone" error={!isPhone(profile.phone) ? "Use a mobile number like 09171234567" : ""}>
          <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </FormField>
        {isCustomer && (
          <>
            <FormField label="Security question">
              <select value={profile.securityQuestion} onChange={(e) => setProfile({ ...profile, securityQuestion: e.target.value })}>
                {securityQuestions.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </FormField>
            <FormField label="New answer (leave blank to keep your current answer)">
              <input value={profile.securityAnswer} onChange={(e) => setProfile({ ...profile, securityAnswer: e.target.value })} />
            </FormField>
          </>
        )}
        <button className="btn-blue" disabled={profile.name.trim().length < 2 || !isPhone(profile.phone)}>Save changes</button>
      </form>

      <form className="panel" onSubmit={savePassword}>
        <h3>Change password</h3>
        <FormField label="Current password">
          <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
        </FormField>
        <FormField label="New password">
          <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
        </FormField>
        <PasswordChecklist password={passwords.newPassword} />
        <FormField label="Confirm new password" error={passwords.confirm && passwords.confirm !== passwords.newPassword ? "Passwords do not match" : ""}>
          <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
        </FormField>
        <button className="btn-blue" disabled={!passwordOk}>Change password</button>
      </form>

      {!isCustomer && (
        <form className="panel" onSubmit={savePin}>
          <h3>Change PIN</h3>
          <label className="label">Current PIN</label>
          <PinInput value={pins.currentPin} onChange={(v) => setPins({ ...pins, currentPin: v })} />
          <label className="label">New PIN</label>
          <PinInput value={pins.newPin} onChange={(v) => setPins({ ...pins, newPin: v })} />
          <button className="btn-blue" disabled={!isPin(pins.currentPin) || !isPin(pins.newPin)} style={{ marginTop: 16 }}>Change PIN</button>
        </form>
      )}
    </div>
  );
};

export default Profile;
```

## 65. `client/src/pages/admin/AdminDashboard.js`

```javascript
import { useState, useEffect } from "react";
import { Tabs, message } from "antd";
import api from "../../api";
import LineChart from "../../components/LineChart";
import BarList from "../../components/BarList";
import { formatPeso, getErrorMessage, presetRange } from "../../tools/helpers";

// Admin dashboard: sales and analytics (the admin monitors, the staff handle the transactions)
const AdminDashboard = () => {
  const [preset, setPreset] = useState("last7");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/stats/admin", { params: presetRange(preset) })
      .then((response) => setStats(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, [preset]);

  const cards = stats
    ? [
        { title: "Total sales", value: formatPeso(stats.totalSales), note: "Money collected, refunds removed" },
        { title: "Total bookings", value: stats.totalBookings, note: "Games in this period" },
        { title: "Active users", value: stats.activeUsers, note: "Customers who booked" },
        { title: "Peak hours", value: stats.peakHours, note: "The busiest 3 hours", small: true },
      ]
    : [];

  const toRows = (list) => list.map((x) => ({ label: x.name, value: x.amount, text: formatPeso(x.amount) }));

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="muted">Sales and analytics of MetParkSports.</p>
        </div>
        <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Period" className="select-small">
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
          <option value="month">This month</option>
        </select>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat" key={c.title}>
            <span>{c.title}</span>
            <b className={c.small ? "small-value" : ""}>{c.value}</b>
            <small>{c.note}</small>
          </div>
        ))}
      </div>

      {stats && (
        <div className="panel">
          <Tabs
            items={[
              { key: "overview", label: "Sales Overview", children: <LineChart data={stats.salesByDay} /> },
              { key: "sport", label: "Sales by Sport", children: <BarList rows={toRows(stats.salesBySport)} /> },
              { key: "court", label: "Sales by Court", children: <BarList rows={toRows(stats.salesByCourt)} /> },
              {
                key: "equipment",
                label: "Top Equipment",
                children: (
                  <BarList
                    rows={stats.topEquipment.map((e) => ({ label: e.name, value: e.quantity, text: `${e.quantity} rented · ${formatPeso(e.revenue)}` }))}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
```

## 66. `client/src/pages/admin/AdminMonitoring.js`

```javascript
import { useState, useEffect } from "react";
import { message } from "antd";
import api from "../../api";
import BarList from "../../components/BarList";
import { getErrorMessage, hourLabel, presetRange } from "../../tools/helpers";

// Court monitoring: how the courts are used. The admin only watches. Staff handle the transactions.
const AdminMonitoring = () => {
  const [preset, setPreset] = useState("last7");
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get("/stats/monitoring", { params: presetRange(preset) })
      .then((response) => setData(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, [preset]);

  if (!data) return <div className="page-pad"><p>Loading...</p></div>;

  const peak = Math.max(...data.byHour.map((h) => h.count), 1);

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">Court Monitoring</h1>
          <p className="muted">How the courts are used. Monitoring only.</p>
        </div>
        <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Period" className="select-small">
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
          <option value="month">This month</option>
        </select>
      </div>

      <div className="stat-grid">
        <div className="stat"><span>Active courts</span><b>{data.activeCourts}</b><small>Open for booking</small></div>
        <div className="stat"><span>Under maintenance</span><b style={{ color: "#B45309" }}>{data.maintenanceCourts}</b><small>Closed for now</small></div>
        <div className="stat"><span>Average usage</span><b style={{ color: "#1769F5" }}>{data.averageUsage}%</b><small>Booked hours / open hours</small></div>
        <div className="stat"><span>Peak hours</span><b className="small-value">{data.peakHours}</b><small>The busiest 3 hours</small></div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>Usage by court</h3>
          <BarList rows={data.usage.map((u) => ({ label: u.name + (u.status === "maintenance" ? " (maintenance)" : ""), value: u.usage, text: `${u.usage}%` }))} />
        </div>

        <div className="panel">
          <h3>Bookings by hour</h3>
          <div className="hour-chart">
            {data.byHour.map((h) => (
              <div key={h.hour} className="hour-col" title={`${hourLabel(h.hour)}: ${h.count} bookings`}>
                <div className={`hour-bar ${h.count === peak && h.count > 0 ? "peak" : ""}`} style={{ height: `${(h.count / peak) * 100}%` }} />
                <span>{h.hour % 12 === 0 ? 12 : h.hour % 12}{h.hour >= 12 ? "p" : "a"}</span>
              </div>
            ))}
          </div>
          <p className="muted small">The darkest bar is the busiest hour.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminMonitoring;
```

## 67. `client/src/pages/admin/AdminReports.js`

```javascript
import { useState, useEffect } from "react";
import { Table, Tabs, message } from "antd";
import api from "../../api";
import usePaged from "../../tools/usePaged";
import PagedTable from "../../components/PagedTable";
import { addDaysString, formatDate, formatPeso, getErrorMessage } from "../../tools/helpers";

const kindLabel = { downpayment: "Downpayment", full: "Full payment", balance: "Balance", refund: "Refund" };

// Reports: choose a date range, press Generate
const AdminReports = () => {
  const [from, setFrom] = useState(addDaysString(-29));
  const [to, setTo] = useState(addDaysString(0));
  const [range, setRange] = useState({ from, to }); // the range that was generated
  const [stats, setStats] = useState(null);
  const transactions = usePaged("/stats/transactions", range);

  useEffect(() => {
    api
      .get("/stats/admin", { params: range })
      .then((response) => setStats(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, [range]);

  const rangeError = from > to ? "The start date must be before the end date" : "";

  const money = (v) => formatPeso(v);
  const nameAmount = [
    { title: "Name", dataIndex: "name" },
    { title: "Sales", dataIndex: "amount", render: money },
  ];

  const columns = [
    { title: "Date", render: (_, t) => new Date(t.at).toLocaleDateString() },
    { title: "Ref.", dataIndex: "refNo" },
    { title: "Customer", dataIndex: "customer" },
    { title: "Court", dataIndex: "court" },
    { title: "Type", render: (_, t) => kindLabel[t.kind] },
    { title: "Amount", render: (_, t) => <b style={{ color: t.amount < 0 ? "#B42318" : undefined }}>{money(t.amount)}</b> },
    { title: "Reservation", dataIndex: "status" },
  ];

  return (
    <div className="page-pad">
      <h1 className="page-title">Reports</h1>
      <p className="muted">Sales by date range, sport, court, and equipment.</p>

      <div className="filters">
        <label className="inline-label">From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="inline-label">To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn-blue" disabled={!!rangeError} onClick={() => setRange({ from, to })}>Generate</button>
        {rangeError && <span className="field-msg bad">{rangeError}</span>}
      </div>

      {stats && (
        <>
          <div className="stat-grid three">
            <div className="stat"><span>Total sales</span><b>{money(stats.totalSales)}</b><small>{formatDate(stats.from)} - {formatDate(stats.to)}</small></div>
            <div className="stat"><span>Total bookings</span><b>{stats.totalBookings}</b><small>Games in this period</small></div>
            <div className="stat"><span>Average order value</span><b>{money(stats.averageOrder)}</b><small>Per reservation</small></div>
          </div>

          <div className="panel">
            <Tabs
              items={[
                {
                  key: "date",
                  label: "Sales by Date",
                  children: (
                    <Table
                      rowKey="date"
                      size="small"
                      dataSource={[...stats.salesByDay].reverse()}
                      pagination={{ pageSize: 7, showSizeChanger: false }}
                      columns={[
                        { title: "Date", render: (_, r) => formatDate(r.date) },
                        { title: "Sales", dataIndex: "amount", render: money },
                      ]}
                    />
                  ),
                },
                { key: "sport", label: "By Sport", children: <Table rowKey="name" size="small" dataSource={stats.salesBySport} columns={nameAmount} pagination={false} /> },
                { key: "court", label: "By Court", children: <Table rowKey="name" size="small" dataSource={stats.salesByCourt} columns={nameAmount} pagination={{ pageSize: 7, showSizeChanger: false }} /> },
                {
                  key: "equipment",
                  label: "Top Equipment",
                  children: (
                    <Table
                      rowKey="name"
                      size="small"
                      dataSource={stats.topEquipment}
                      pagination={false}
                      columns={[
                        { title: "Equipment", dataIndex: "name" },
                        { title: "Rented", dataIndex: "quantity" },
                        { title: "Revenue", dataIndex: "revenue", render: money },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        </>
      )}

      <h3 className="section-title">Recent transactions</h3>
      <div className="panel flush">
        <PagedTable columns={columns} paged={transactions} />
      </div>
    </div>
  );
};

export default AdminReports;
```

## 68. `client/src/pages/admin/AdminUsers.js`

```javascript
import { useState } from "react";
import { Modal, Popconfirm, Tabs, message } from "antd";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";
import usePaged from "../../tools/usePaged";
import PagedTable from "../../components/PagedTable";
import FormField from "../../components/FormField";
import PasswordChecklist from "../../components/PasswordChecklist";
import { getErrorMessage } from "../../tools/helpers";
import { isPasswordValid, isPhone, useEmailCheck } from "../../tools/validators";

const emptyStaff = { name: "", email: "", username: "", phone: "", role: "staff", password: "" };

// Admin manages the accounts: customers (view, edit, archive) and staff (add, edit, reset PIN, archive)
const AdminUsers = () => {
  const { user: me } = useAuth();
  const [group, setGroup] = useState("customers");
  const [search, setSearch] = useState("");
  const paged = usePaged("/users", { group, search });

  const [adding, setAdding] = useState(null); // form of a new staff account
  const [editing, setEditing] = useState(null); // form of the account being edited
  const emailState = useEmailCheck(adding ? adding.email : "");

  const call = async (request, success) => {
    try {
      const response = await request();
      if (success) message.success(success);
      paged.refresh();
      return response;
    } catch (error) {
      message.error(getErrorMessage(error));
      return null;
    }
  };

  // The temporary PIN is shown only once, so the admin can tell it to the staff
  const showTempPin = (title, name, tempPin) =>
    Modal.info({
      title,
      content: (
        <div>
          <p>Give this temporary PIN to <b>{name}</b>. It is shown only once.</p>
          <p className="temp-pin">{tempPin}</p>
          <p>They must choose their own PIN at the next login.</p>
        </div>
      ),
    });

  const createStaff = async () => {
    const response = await call(() => api.post("/users", adding), "Account created");
    if (response) {
      setAdding(null);
      showTempPin("Account created", response.data.user.name, response.data.tempPin);
    }
  };

  const saveEdit = async () => {
    const { _id, name, phone, role, password } = editing;
    const response = await call(() => api.put(`/users/${_id}`, { name, phone, role, password }), "Saved");
    if (response) setEditing(null);
  };

  const resetPin = async (u) => {
    const response = await call(() => api.put(`/users/${u._id}/reset-pin`));
    if (response) showTempPin("PIN reset", u.name, response.data.tempPin);
  };

  const isStaffGroup = group === "staff";

  const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Email / Username", render: (_, u) => <span>{u.email}{u.username && <small className="muted"> · {u.username}</small>}</span> },
    { title: "Role", render: (_, u) => (u.role === "user" ? "Customer" : u.role === "staff" ? "Staff" : "Admin") },
    { title: "Status", render: () => <span className="pill" style={{ background: "#DDF5E8", color: "#157347" }}>Active</span> },
    {
      title: "Actions",
      render: (_, u) => (
        <div className="row-actions">
          <button className="btn-line small" onClick={() => setEditing({ ...u, password: "" })}>Edit</button>
          {isStaffGroup && u._id !== me._id && (
            <Popconfirm title={`Reset the PIN of ${u.name}?`} onConfirm={() => resetPin(u)}>
              <button className="btn-line small">Reset PIN</button>
            </Popconfirm>
          )}
          {u._id !== me._id && (
            <Popconfirm title="Archive this account? They will no longer be able to log in." onConfirm={() => call(() => api.put(`/archive/users/${u._id}/archive`), "Moved to the archive")}>
              <button className="btn-line small danger">Archive</button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  // Checks for the "Add staff" form
  const addProblems = adding
    ? {
        name: adding.name.trim().length < 2 ? "Enter the full name" : "",
        email: !adding.email ? "Email is required" : emailState === "invalid" ? "Enter a valid email address" : emailState === "taken" ? "This email is already registered" : "",
        phone: !isPhone(adding.phone) ? "Use a mobile number like 09171234567" : "",
        password: isPasswordValid(adding.password) ? "" : "The password must follow all the rules",
      }
    : {};
  const addValid = adding && Object.values(addProblems).every((p) => !p) && emailState === "available";

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="muted">Manage customers, staff and admin accounts.</p>
        </div>
        {isStaffGroup && <button className="btn-blue" onClick={() => setAdding(emptyStaff)}>+ Add Staff</button>}
      </div>

      <Tabs
        activeKey={group}
        onChange={(key) => { setGroup(key); setSearch(""); }}
        items={[{ key: "customers", label: "Customers" }, { key: "staff", label: "Staff & Admin" }]}
      />
      <div className="filters">
        <input placeholder="Search by name or email" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="panel flush">
        <PagedTable columns={columns} paged={paged} />
      </div>

      {/* Add staff */}
      <Modal open={!!adding} title="Add staff or admin account" onCancel={() => setAdding(null)} onOk={createStaff} okText="Create account" okButtonProps={{ disabled: !addValid }}>
        {adding && (
          <div>
            <FormField label="Full name" error={adding.name ? addProblems.name : ""}>
              <input value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
            </FormField>
            <FormField
              label="Email"
              error={adding.email ? addProblems.email : ""}
              ok={emailState === "available" ? "Email is available" : ""}
              hint={emailState === "checking" ? "Checking..." : ""}
            >
              <input value={adding.email} onChange={(e) => setAdding({ ...adding, email: e.target.value })} />
            </FormField>
            <div className="row2">
              <FormField label="Username (optional)">
                <input value={adding.username} onChange={(e) => setAdding({ ...adding, username: e.target.value })} />
              </FormField>
              <FormField label="Role">
                <select value={adding.role} onChange={(e) => setAdding({ ...adding, role: e.target.value })}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </FormField>
            </div>
            <FormField label="Phone (optional)" error={addProblems.phone}>
              <input value={adding.phone} onChange={(e) => setAdding({ ...adding, phone: e.target.value })} />
            </FormField>
            <FormField label="Password">
              <input type="password" value={adding.password} onChange={(e) => setAdding({ ...adding, password: e.target.value })} />
            </FormField>
            <PasswordChecklist password={adding.password} />
            <p className="muted small">A temporary 6-digit PIN is created for the new account. You will see it once.</p>
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editing}
        title={editing ? `Edit ${editing.email}` : ""}
        onCancel={() => setEditing(null)}
        onOk={saveEdit}
        okText="Save"
        okButtonProps={{ disabled: !editing || editing.name.trim().length < 2 || !isPhone(editing.phone || "") || (!!editing.password && !isPasswordValid(editing.password)) }}
      >
        {editing && (
          <div>
            <FormField label="Full name">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </FormField>
            <FormField label="Phone" error={!isPhone(editing.phone || "") ? "Use a mobile number like 09171234567" : ""}>
              <input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </FormField>
            {editing.role !== "user" && (
              <FormField label="Role">
                <select value={editing.role} disabled={editing._id === me._id} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </FormField>
            )}
            <FormField label="New password (leave blank to keep the current one)">
              <input type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
            </FormField>
            {editing.password && <PasswordChecklist password={editing.password} />}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUsers;
```

## 69. `client/src/pages/staff/StaffCatalog.js`

```javascript
import { useState } from "react";
import { Modal, Popconfirm, Tabs, message } from "antd";
import api from "../../api";
import usePaged from "../../tools/usePaged";
import PagedTable from "../../components/PagedTable";
import FormField from "../../components/FormField";
import { formatPeso, getErrorMessage, sports } from "../../tools/helpers";

const timeOptions = Array.from({ length: 25 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

const emptyCourt = {
  name: "",
  sport: "Basketball",
  location: "MET Park Sports Center, Metrobank Ave., Met Park, Pasay City",
  hourlyRate: "",
  openTime: "07:00",
  closeTime: "24:00",
  description: "",
  status: "available",
};
const emptyEquipment = { name: "", sport: "All", pricePerHour: "", stock: "", description: "", status: "available" };

// Staff manage the courts and the equipment: add, edit, maintenance, archive
const StaffCatalog = () => {
  const [tab, setTab] = useState("courts");
  const [search, setSearch] = useState("");
  const courts = usePaged("/courts", { search });
  const equipment = usePaged("/equipment", { search });
  const paged = tab === "courts" ? courts : equipment;

  const [form, setForm] = useState(null); // the record in the pop-up form (null = closed)
  const isNew = form && !form._id;

  const change = (field, value) => setForm({ ...form, [field]: value });

  const call = async (request, success) => {
    try {
      await request();
      message.success(success);
      paged.refresh();
      return true;
    } catch (error) {
      message.error(getErrorMessage(error));
      return false;
    }
  };

  const save = async () => {
    const url = tab === "courts" ? "/courts" : "/equipment";
    const ok = await call(() => (isNew ? api.post(url, form) : api.put(`${url}/${form._id}`, form)), isNew ? "Added" : "Saved");
    if (ok) setForm(null);
  };

  const toggleStatus = (r) => {
    const url = tab === "courts" ? "/courts" : "/equipment";
    const next = r.status === "available" ? (tab === "courts" ? "maintenance" : "unavailable") : "available";
    call(() => api.put(`${url}/${r._id}`, { ...r, status: next }), "Status updated");
  };

  const archive = (r) => call(() => api.put(`/archive/${tab}/${r._id}/archive`), "Moved to the archive");

  const pill = (status) => (
    <span className="pill" style={status === "available" ? { background: "#DDF5E8", color: "#157347" } : { background: "#FFF1D6", color: "#8A4B00" }}>
      {status === "available" ? "Active" : status === "maintenance" ? "Maintenance" : "Unavailable"}
    </span>
  );

  const actions = (r) => (
    <div className="row-actions">
      <button className="btn-line small" onClick={() => setForm(r)}>Edit</button>
      <button className="btn-line small" onClick={() => toggleStatus(r)}>
        {r.status === "available" ? (tab === "courts" ? "Maintenance" : "Disable") : "Activate"}
      </button>
      <Popconfirm title="Move to the archive?" onConfirm={() => archive(r)}>
        <button className="btn-line small danger">Archive</button>
      </Popconfirm>
    </div>
  );

  const courtColumns = [
    { title: "Court name", dataIndex: "name" },
    { title: "Sport", dataIndex: "sport" },
    { title: "Rate", render: (_, r) => `${formatPeso(r.hourlyRate)}/hr` },
    { title: "Hours", render: (_, r) => `${r.openTime} - ${r.closeTime}` },
    { title: "Status", render: (_, r) => pill(r.status) },
    { title: "Actions", render: (_, r) => actions(r) },
  ];
  const equipmentColumns = [
    { title: "Equipment", dataIndex: "name" },
    { title: "Sport", dataIndex: "sport" },
    { title: "Price", render: (_, r) => `${formatPeso(r.pricePerHour)}/hr` },
    { title: "Stock", dataIndex: "stock" },
    { title: "Status", render: (_, r) => pill(r.status) },
    { title: "Actions", render: (_, r) => actions(r) },
  ];

  // Simple checks while typing
  const problem = !form
    ? ""
    : !form.name?.trim() ? "Enter a name"
    : tab === "courts" && (form.hourlyRate === "" || Number(form.hourlyRate) < 0) ? "Enter the rate per hour"
    : tab === "equipment" && (form.pricePerHour === "" || Number(form.pricePerHour) < 0) ? "Enter the price per hour"
    : tab === "equipment" && (form.stock === "" || Number(form.stock) < 0) ? "Enter the stock"
    : "";

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">Courts & Equipment</h1>
          <p className="muted">Add, edit, and set courts and equipment to maintenance.</p>
        </div>
        <button className="btn-blue" onClick={() => setForm(tab === "courts" ? emptyCourt : emptyEquipment)}>
          + Add {tab === "courts" ? "Court" : "Equipment"}
        </button>
      </div>

      <Tabs activeKey={tab} onChange={(key) => { setTab(key); setSearch(""); }} items={[{ key: "courts", label: "Courts" }, { key: "equipment", label: "Equipment" }]} />
      <div className="filters">
        <input placeholder="Search by name" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="panel flush">
        <PagedTable columns={tab === "courts" ? courtColumns : equipmentColumns} paged={paged} />
      </div>

      <Modal
        open={!!form}
        title={`${isNew ? "Add" : "Edit"} ${tab === "courts" ? "court" : "equipment"}`}
        onCancel={() => setForm(null)}
        onOk={save}
        okText="Save"
        okButtonProps={{ disabled: !!problem }}
      >
        {form && (
          <div>
            <FormField label="Name" error={form.name ? "" : "Enter a name"}>
              <input value={form.name} onChange={(e) => change("name", e.target.value)} />
            </FormField>
            <FormField label="Sport">
              <select value={form.sport} onChange={(e) => change("sport", e.target.value)}>
                {tab === "equipment" && <option value="All">All sports</option>}
                {sports.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>

            {tab === "courts" ? (
              <>
                <FormField label="Location">
                  <input value={form.location} onChange={(e) => change("location", e.target.value)} />
                </FormField>
                <div className="row2">
                  <FormField label="Rate per hour (PHP)">
                    <input type="number" min="0" value={form.hourlyRate} onChange={(e) => change("hourlyRate", e.target.value)} />
                  </FormField>
                  <FormField label="Status">
                    <select value={form.status} onChange={(e) => change("status", e.target.value)}>
                      <option value="available">Active</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </FormField>
                </div>
                <div className="row2">
                  <FormField label="Opens">
                    <select value={form.openTime} onChange={(e) => change("openTime", e.target.value)}>
                      {timeOptions.slice(0, -1).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Closes">
                    <select value={form.closeTime} onChange={(e) => change("closeTime", e.target.value)}>
                      {timeOptions.slice(1).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormField>
                </div>
              </>
            ) : (
              <>
                <div className="row2">
                  <FormField label="Price per hour (PHP)">
                    <input type="number" min="0" value={form.pricePerHour} onChange={(e) => change("pricePerHour", e.target.value)} />
                  </FormField>
                  <FormField label="Stock (pieces)">
                    <input type="number" min="0" value={form.stock} onChange={(e) => change("stock", e.target.value)} />
                  </FormField>
                </div>
                <FormField label="Status">
                  <select value={form.status} onChange={(e) => change("status", e.target.value)}>
                    <option value="available">Active</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </FormField>
              </>
            )}

            <FormField label="Description">
              <input value={form.description} onChange={(e) => change("description", e.target.value)} />
            </FormField>
            {problem && <div className="field-msg bad">{problem}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffCatalog;
```

## 70. `client/src/pages/staff/StaffDashboard.js`

```javascript
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Table, message } from "antd";
import api from "../../api";
import StatusPill from "../../components/StatusPill";
import { formatDate, formatPeso, formatTime, getErrorMessage } from "../../tools/helpers";

const periods = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "month", label: "This month" },
];

// Staff dashboard: what is happening today, and the work that waits for the staff
const StaffDashboard = () => {
  const [period, setPeriod] = useState("today");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/stats/staff", { params: { period } })
      .then((response) => setStats(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, [period]);

  const label = periods.find((p) => p.value === period).label;

  const cards = stats
    ? [
        { title: "Total bookings", value: stats.totalBookings, note: label },
        { title: "Pending verification", value: stats.pendingVerification, note: "Payments to verify", color: "#C2410C" },
        { title: "Collected", value: formatPeso(stats.collected), note: `Money collected (${label.toLowerCase()})` },
        { title: "Completed", value: stats.completed, note: label, color: "#1E7B55" },
      ]
    : [];

  const columns = [
    { title: "Date", render: (_, r) => formatDate(r.date) },
    { title: "Time", render: (_, r) => formatTime(r.startTime) },
    { title: "Court", render: (_, r) => r.court?.name },
    { title: "Customer", render: (_, r) => r.user?.name },
    { title: "Status", render: (_, r) => <StatusPill reservation={r} /> },
  ];

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">Staff Dashboard</h1>
          <p className="muted">Reservations and money collected.</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period" className="select-small">
          {periods.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat" key={c.title}>
            <span>{c.title}</span>
            <b style={{ color: c.color }}>{c.value}</b>
            <small>{c.note}</small>
          </div>
        ))}
      </div>

      <div className="two-col wide-left">
        <div className="panel flush">
          <h3 className="panel-title">{label}'s reservations</h3>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={stats ? stats.reservations : []}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            scroll={{ x: true }}
          />
        </div>

        <div className="panel">
          <h3>Quick actions</h3>
          <Link className="quick" to="/staff/reservations?payment=verify">Verify downpayments</Link>
          <Link className="quick" to="/staff/reservations?status=confirmed">Collect balance</Link>
          <Link className="quick" to="/staff/catalog">Manage courts & equipment</Link>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
```

## 71. `client/src/pages/staff/StaffReservations.js`

```javascript
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Drawer, Modal, Popconfirm, message } from "antd";
import api from "../../api";
import usePaged from "../../tools/usePaged";
import PagedTable from "../../components/PagedTable";
import StatusPill from "../../components/StatusPill";
import { formatDate, formatPeso, formatTime, getErrorMessage, paymentLabel, sports } from "../../tools/helpers";

// The staff handle the transactions: verify payments, collect balances, complete, cancel, archive
const StaffReservations = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: "",
    status: searchParams.get("status") || "",
    sport: "",
    date: "",
    paymentToVerify: searchParams.get("payment") === "verify" ? "true" : "",
  });
  const paged = usePaged("/reservations", filters);
  const [verifying, setVerifying] = useState(null); // the reservation shown in the drawer

  const setFilter = (name, value) => setFilters({ ...filters, [name]: value });

  const call = async (request, success) => {
    try {
      const response = await request();
      message.success(success || response.data.message || "Done");
      setVerifying(null);
      paged.refresh();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const put = (r, action, body) => () => api.put(`/reservations/${r._id}/${action}`, body);

  const confirmCancel = (r) =>
    Modal.confirm({
      title: `Cancel ${r.refNo}?`,
      content: r.amountPaid > 0 ? `The customer will be refunded ${formatPeso(r.amountPaid)}.` : "No payment was made.",
      okText: "Cancel reservation",
      okButtonProps: { danger: true },
      onOk: () => call(put(r, "cancel")),
    });

  // The buttons depend on where the reservation is in the process
  const actions = (r) => {
    const buttons = [];
    if (r.status === "pending" && r.paymentSubmitted) {
      buttons.push(<button key="v" className="btn-blue small" onClick={() => setVerifying(r)}>Verify</button>);
      buttons.push(
        <Popconfirm key="r" title="Reject this payment? The customer can send it again." onConfirm={() => call(put(r, "reject-payment"), "Payment rejected")}>
          <button className="btn-line small danger">Reject</button>
        </Popconfirm>
      );
    }
    if (r.status === "pending" && !r.paymentSubmitted) {
      buttons.push(<span key="w" className="muted small">Waiting for payment</span>);
    }
    if (r.status === "confirmed" && r.paymentStatus === "downpayment_paid") {
      buttons.push(
        <Popconfirm key="b" title={`Collect the balance of ${formatPeso(r.totalPrice - r.amountPaid)}?`} onConfirm={() => call(put(r, "collect-balance"), "Balance collected")}>
          <button className="btn-blue small">Collect balance</button>
        </Popconfirm>
      );
    }
    if (r.status === "confirmed" && r.paymentStatus === "fully_paid") {
      buttons.push(<button key="c" className="btn-blue small" onClick={() => call(put(r, "complete"), "Reservation completed")}>Complete</button>);
    }
    if (["pending", "confirmed"].includes(r.status)) {
      buttons.push(<button key="x" className="btn-line small danger" onClick={() => confirmCancel(r)}>Cancel</button>);
    }
    if (["completed", "cancelled", "expired"].includes(r.status)) {
      buttons.push(
        <Popconfirm key="a" title="Move to the archive?" onConfirm={() => call(() => api.put(`/archive/reservations/${r._id}/archive`), "Moved to the archive")}>
          <button className="btn-line small">Archive</button>
        </Popconfirm>
      );
    }
    return <div className="row-actions">{buttons}</div>;
  };

  const columns = [
    { title: "Ref.", dataIndex: "refNo", render: (v) => <b>{v}</b> },
    { title: "Customer", render: (_, r) => r.user?.name || "(deleted user)" },
    { title: "Court", render: (_, r) => r.court?.name },
    { title: "Date & time", render: (_, r) => `${formatDate(r.date)} · ${formatTime(r.startTime)}` },
    { title: "Paid", render: (_, r) => formatPeso(r.amountPaid) },
    { title: "Balance", render: (_, r) => formatPeso(["cancelled", "expired"].includes(r.status) ? 0 : r.totalPrice - r.amountPaid) },
    { title: "Status", render: (_, r) => <StatusPill reservation={r} /> },
    { title: "Actions", render: (_, r) => actions(r) },
  ];

  return (
    <div className="page-pad">
      <h1 className="page-title">Reservations</h1>
      <p className="muted">Verify downpayments, confirm reservations and collect balances.</p>

      <div className="filters">
        <input placeholder="Search customer or reference" aria-label="Search" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} />
        <select aria-label="Status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <select aria-label="Sport" value={filters.sport} onChange={(e) => setFilter("sport", e.target.value)}>
          <option value="">All sports</option>
          {sports.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" aria-label="Game date" value={filters.date} onChange={(e) => setFilter("date", e.target.value)} />
        <label className="check">
          <input type="checkbox" checked={!!filters.paymentToVerify} onChange={(e) => setFilter("paymentToVerify", e.target.checked ? "true" : "")} />
          Payments to verify
        </label>
      </div>

      <div className="panel flush">
        <PagedTable columns={columns} paged={paged} />
      </div>

      {/* Verify downpayment */}
      <Drawer open={!!verifying} onClose={() => setVerifying(null)} title="Verify downpayment" width={380}>
        {verifying && (
          <div>
            <p className="muted">{verifying.refNo}</p>
            <div className="kv"><span>Customer</span><b>{verifying.user?.name}</b></div>
            <div className="kv"><span>Court</span><b>{verifying.court?.name}</b></div>
            <div className="kv"><span>Game</span><b>{formatDate(verifying.date)} · {formatTime(verifying.startTime)}</b></div>
            <hr />
            <div className="kv"><span>Method</span><b>{verifying.paymentMethod}</b></div>
            <div className="kv"><span>Reference</span><b>{verifying.paymentReference}</b></div>
            <div className="kv"><span>Total</span><b>{formatPeso(verifying.totalPrice)}</b></div>
            <div className="kv"><span>Amount paid</span><b>{formatPeso(verifying.paymentDeclared)} ({verifying.paymentOption === "full" ? "full" : "downpayment"})</b></div>
            <p className="muted small">Check the reference number in your payment account before you verify.</p>
            <button className="btn-blue block-btn" onClick={() => call(put(verifying, "verify-payment"), "Payment verified. Reservation confirmed.")}>
              Verify payment
            </button>
            <Popconfirm title="Reject this payment? The customer can send it again." onConfirm={() => call(put(verifying, "reject-payment"), "Payment rejected")}>
              <button className="btn-line block-btn danger">Reject</button>
            </Popconfirm>
            <p className="muted small">Payment status: {paymentLabel[verifying.paymentStatus]}. A verified payment moves the reservation to Confirmed.</p>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default StaffReservations;
```

## 72. `client/src/tools/helpers.js`

```javascript
// Questions the customer can choose from for password recovery
export const securityQuestions = [
  "What is the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "In what city were you born?",
  "What is your favorite food?",
];

export const sports = ["Basketball", "Volleyball", "Badminton", "Pickleball"];

// Color of each sport
export const sportColors = {
  Basketball: "#C2410C",
  Volleyball: "#1E7B55",
  Badminton: "#1B6CB8",
  Pickleball: "#8A6A00",
};

// Get the error message sent by the server (or a fallback)
export const getErrorMessage = (error) =>
  error.response?.data?.message || "Something went wrong. Please try again.";

// 1800 -> "₱1,800"
export const formatPeso = (amount) => `₱${Number(amount || 0).toLocaleString("en-PH")}`;

const pad = (n) => String(n).padStart(2, "0");

// Date N days from today as YYYY-MM-DD (0 = today)
export const addDaysString = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// "2026-10-20" -> "Oct 20, 2026"
export const formatDate = (dateString) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// "09:00" -> "9:00 AM",  "24:00" -> "12:00 AM"
export const formatTime = (time) => {
  const hour = parseInt(time.split(":")[0], 10);
  const minutes = time.split(":")[1];
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minutes} ${hour % 24 >= 12 ? "PM" : "AM"}`;
};

// 7 -> "7:00 AM"
export const hourLabel = (hour) => formatTime(`${pad(hour)}:00`);

// The label and colors of a reservation status
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

// Where each role goes after logging in
export const homePath = (role) =>
  role === "admin" ? "/admin/dashboard" : role === "staff" ? "/staff/dashboard" : "/my-reservations";

// "last7" | "last30" | "month"  ->  { from, to } as YYYY-MM-DD
export const presetRange = (preset) => {
  const to = addDaysString(0);
  if (preset === "last30") return { from: addDaysString(-29), to };
  if (preset === "month") return { from: `${to.slice(0, 8)}01`, to };
  return { from: addDaysString(-6), to };
};
```

## 73. `client/src/tools/usePaged.js`

```javascript
import { useState, useEffect, useCallback } from "react";
import { message } from "antd";
import api from "../api";
import { getErrorMessage } from "./helpers";

// Loads ONE page of a list from the server (server-side pagination).
//   const { data, total, page, limit, loading, setPage, refresh } = usePaged("/reservations", { status });
// When the filters change, it goes back to page 1.
const usePaged = (url, params = {}, limit = 10) => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(params);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(url, { params: { ...JSON.parse(key), page, limit } })
      .then((response) => {
        setData(response.data.items);
        setTotal(response.data.total);
      })
      .catch((error) => message.error(getErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [url, key, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [key]);

  return { data, total, page, limit, loading, setPage, refresh: load };
};

export default usePaged;
```

## 74. `client/src/tools/useRules.js`

```javascript
import { useState, useEffect } from "react";
import api from "../api";

// Loads the business rules from the server (advance days, door charge, downpayment...)
// The default values are used until the server answers.
const useRules = () => {
  const [rules, setRules] = useState({
    advanceBookingDays: 2,
    doorChargePerHead: 50,
    openTime: "07:00",
    closeTime: "24:00",
    downpaymentPercent: 50,
    unpaidExpiryHours: 12,
    refundDaysBefore: 3,
    paymentMethods: ["GCash", "Maya", "Bank transfer", "Pay at the counter"],
  });

  useEffect(() => {
    api
      .get("/rules")
      .then((response) => setRules(response.data))
      .catch(() => {}); // keep the defaults if it fails
  }, []);

  return rules;
};

export default useRules;
```

## 75. `client/src/tools/validators.js`

```javascript
import { useState, useEffect } from "react";
import api from "../api";

// The password rules. The checklist ticks them off while the user types.
export const passwordRules = (password = "") => [
  { label: "At least 8 characters", ok: password.length >= 8 },
  { label: "1 uppercase letter", ok: /[A-Z]/.test(password) },
  { label: "1 lowercase letter", ok: /[a-z]/.test(password) },
  { label: "1 number", ok: /\d/.test(password) },
  { label: "1 special character (!@#$%^&*)", ok: /[^A-Za-z0-9]/.test(password) },
];

export const isPasswordValid = (password) => passwordRules(password).every((rule) => rule.ok);

export const isEmail = (email = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX (empty is allowed)
export const isPhone = (phone = "") =>
  !phone || /^(09\d{9}|\+639\d{9})$/.test(phone.replace(/[\s-]/g, ""));

export const isPin = (pin = "") => /^\d{6}$/.test(pin);

// Payment reference: letters, numbers and dashes, 6 to 30 characters
export const isReference = (ref = "") => /^[A-Za-z0-9-]{6,30}$/.test(ref);

// Live "email already taken" check. It waits half a second after the user stops typing.
// Result: "idle" | "invalid" | "checking" | "available" | "taken"
export const useEmailCheck = (email) => {
  const [state, setState] = useState("idle");

  useEffect(() => {
    if (!email) {
      setState("idle");
      return;
    }
    if (!isEmail(email)) {
      setState("invalid");
      return;
    }
    setState("checking");
    const timer = setTimeout(() => {
      api
        .get("/auth/check-email", { params: { email } })
        .then((response) => setState(response.data.available ? "available" : "taken"))
        .catch(() => setState("idle"));
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  return state;
};
```
