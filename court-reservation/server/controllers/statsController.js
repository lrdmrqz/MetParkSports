const Reservation = require("../models/Reservation");
const Court = require("../models/Court");
const rules = require("../config/rules");
const { expireUnpaid } = require("./reservationController");
const {
  rangeFor,
  today,
  addDays,
  dayStart,
  dayEnd,
  daysInRange,
} = require("../utils/dates");

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// "Sales" = money really collected (payments verified by staff, minus refunds)
const paymentsBetween = async (from, to) => {
  const start = dayStart(from);
  const end = dayEnd(to);
  const reservations = await Reservation.find({
    "payments.at": { $gte: start, $lte: end },
  })
    .populate("court", "name sport")
    .populate("user", "name");
  const entries = [];
  reservations.forEach((r) =>
    r.payments.forEach((p) => {
      if (p.at >= start && p.at <= end)
        entries.push({ reservation: r, payment: p });
    }),
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
    const total =
      (hourCounts[h] || 0) +
      (hourCounts[h + 1] || 0) +
      (hourCounts[h + 2] || 0);
    if (total > best) {
      best = total;
      bestStart = h;
    }
  }
  const fmt = (h) =>
    `${h % 12 === 0 ? 12 : h % 12}:00 ${h % 24 >= 12 ? "PM" : "AM"}`;
  return best > 0 ? `${fmt(bestStart)} - ${fmt(bestStart + 3)}` : "No data yet";
};

const countHours = (reservations) => {
  const counts = {};
  reservations.forEach((r) => {
    for (
      let h = Math.floor(toMinutes(r.startTime) / 60);
      h < toMinutes(r.endTime) / 60;
      h++
    ) {
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
    const reservations = await reservationsBetween(from, to)
      .populate("user", "name")
      .sort({ date: 1, startTime: 1 });
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

// GET /api/stats/admin
const adminStats = async (req, res) => {
  try {
    const to = req.query.to || today();
    const from = req.query.from || addDays(to, -6);

    const entries = await paymentsBetween(from, to);
    const reservations = await reservationsBetween(from, to);

    const perDay = {};
    for (let i = 0; i < daysInRange(from, to); i++)
      perDay[addDays(from, i)] = 0;
    entries.forEach((e) => {
      const key = `${e.payment.at.getFullYear()}-${String(e.payment.at.getMonth() + 1).padStart(2, "0")}-${String(e.payment.at.getDate()).padStart(2, "0")}`;
      if (key in perDay) perDay[key] += e.payment.amount;
    });

    const bySport = {};
    const byCourt = {};
    entries.forEach((e) => {
      const sport = e.reservation.court ? e.reservation.court.sport : "Other";
      const court = e.reservation.court ? e.reservation.court.name : "Other";
      bySport[sport] = (bySport[sport] || 0) + e.payment.amount;
      byCourt[court] = (byCourt[court] || 0) + e.payment.amount;
    });

    const equipment = {};
    const seen = new Set();
    entries.forEach(({ reservation: r }) => {
      const id = String(r._id);
      if (seen.has(id) || ["cancelled", "expired"].includes(r.status)) return;
      seen.add(id);
      r.equipment.forEach((e) => {
        if (e.name.toLowerCase() === "court shoes rental") return;
        equipment[e.name] = equipment[e.name] || {
          name: e.name,
          quantity: 0,
          revenue: 0,
        };
        equipment[e.name].quantity += e.quantity;
        equipment[e.name].revenue += e.fee;
      });
    });

    const totalSales = sum(entries.map((e) => e.payment.amount));

    const refundEntries = entries.filter((e) => e.payment.kind === "refund");

    const totalRefunds = sum(
      refundEntries.map((e) => Math.abs(e.payment.amount)),
    );

    const refundTransactions = refundEntries.length;

    const toRows = (obj) =>
      Object.entries(obj)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
    res.json({
      from,
      to,
      totalSales,
      totalRefunds,
      refundTransactions,
      totalBookings: reservations.length,
      activeUsers: new Set(reservations.map((r) => r.user.toString())).size,
      averageOrder: reservations.length
        ? Math.round(
            sum(reservations.map((r) => r.totalPrice)) / reservations.length,
          )
        : 0,
      peakHours: peakLabel(countHours(reservations)),
      salesByDay: Object.entries(perDay).map(([date, amount]) => ({
        date,
        amount,
      })),
      salesBySport: toRows(bySport),
      salesByCourt: toRows(byCourt),
      topEquipment: Object.values(equipment).sort(
        (a, b) => b.quantity - a.quantity,
      ),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/stats/transactions?from=&to=&page=&limit=
const transactions = async (req, res) => {
  try {
    const to = req.query.to || today();
    const from = req.query.from || addDays(to, -6);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      50,
    );

    const rows = (await paymentsBetween(from, to))
      .map((e) => ({
        _id: `${e.reservation._id}-${e.payment.at.getTime()}-${e.payment.kind}`,
        at: e.payment.at,
        refNo: e.reservation.refNo,
        customer: e.reservation.user
          ? e.reservation.user.name
          : "(deleted user)",
        court: e.reservation.court
          ? e.reservation.court.name
          : "(deleted court)",
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

// GET /api/stats/monitoring?from=&to=   
const monitoring = async (req, res) => {
  try {
    const to = req.query.to || today();
    const from = req.query.from || addDays(to, -6);
    const days = daysInRange(from, to);

    const courts = await Court.find({ isArchived: { $ne: true } }).sort({
      sport: 1,
      name: 1,
    });
    const reservations = await reservationsBetween(from, to);

    const bookedHours = {};
    reservations.forEach((r) => {
      if (!r.court) return;
      bookedHours[r.court._id] =
        (bookedHours[r.court._id] || 0) +
        (toMinutes(r.endTime) - toMinutes(r.startTime)) / 60;
    });

    const usage = courts.map((court) => {
      const open =
        (toMinutes(court.closeTime) - toMinutes(court.openTime)) / 60;
      const percent = Math.min(
        Math.round(((bookedHours[court._id] || 0) / (open * days)) * 100),
        100,
      );
      return {
        _id: court._id,
        name: court.name,
        sport: court.sport,
        status: court.status,
        usage: percent,
      };
    });

    const hourCounts = countHours(reservations);
    const byHour = [];
    for (let h = 7; h < 24; h++)
      byHour.push({ hour: h, count: hourCounts[h] || 0 });

    res.json({
      from,
      to,
      activeCourts: courts.filter((c) => c.status === "available").length,
      maintenanceCourts: courts.filter((c) => c.status === "maintenance")
        .length,
      averageUsage: usage.length
        ? Math.round(sum(usage.map((u) => u.usage)) / usage.length)
        : 0,
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
