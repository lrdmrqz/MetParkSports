require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Court = require("./models/Court");
const Equipment = require("./models/Equipment");
const Reservation = require("./models/Reservation");
const rules = require("./config/rules");

const LOCATION = "MET Park Sports Center, Metrobank Ave., Met Park, Pasay City";

// courts
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


const equipment = [
  { name: "Badminton Racket Set", sport: "Badminton", pricePerHour: 100, stock: 8, description: "2 rackets and 1 shuttlecock" },
  { name: "Shuttlecock Tube", sport: "Badminton", pricePerHour: 50, stock: 12, description: "12 shuttlecocks" },
  { name: "Basketball", sport: "Basketball", pricePerHour: 50, stock: 6, description: "Size 7 indoor ball" },
  { name: "Volleyball", sport: "Volleyball", pricePerHour: 50, stock: 6, description: "Indoor volleyball" },
  { name: "Pickleball Paddle Set", sport: "Pickleball", pricePerHour: 100, stock: 8, description: "2 paddles and 1 ball" },
];


// Password for everyone: Password@123
// PIN for staff and admin: 123456
const SECURITY_QUESTION = "What is the name of your first pet?";
const staffAccounts = [
  { name: "Lard Marquez", email: "lardm@yopmail.com", username: "lard.admin", phone: "09171234501", role: "admin" },
  { name: "Kirk Bacarro", email: "kirkb@yopmail.com", username: "kirk.admin", phone: "09171234502", role: "admin" },
  { name: "Gab Castro", email: "gabc@yopmail.com", username: "gab.staff", phone: "09171234503", role: "staff" },
  { name: "Wenzeng Xu", email: "zengx@yopmail.com", username: "zeng.staff", phone: "09171234504", role: "staff" },
  { name: "Marcus Santiago", email: "cus@yopmail.com", username: "cus.staff", phone: "09171234505", role: "staff" },
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
// transac
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

  //  Clean the database
  await Reservation.deleteMany({});
  await Equipment.deleteMany({});
  await Court.deleteMany({});
  await User.deleteMany({});
  console.log("Old data removed");

  //Courts and equipment
  const createdCourts = await Court.insertMany(courts.map((c) => ({ ...c, location: LOCATION })));
  const courtByName = {};
  createdCourts.forEach((c) => (courtByName[c.name] = c));
  const createdEquipment = await Equipment.insertMany(equipment);
  const equipmentByName = {};
  createdEquipment.forEach((e) => (equipmentByName[e.name] = e));
  console.log(`${createdCourts.length} courts and ${createdEquipment.length} equipment items created`);

  //Users
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

  // Completed reservations with their payments
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
  console.log("Admin    : lardm@yopmail.com  (username lard.admin)");
  console.log("Staff    : gabc@yopmail.com         (username gab.staff)");
  console.log("Customer : juan.delacruz@yopmail.com");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((e) => {
  console.log(e.message);
  process.exit(1);
});
