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

// GET /api/reservations/calendar/
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

// PUT /api/reservations/:id/collect-balance  
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

// PUT /api/reservations/:id/complete  
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
