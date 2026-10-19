const Reservation = require("../models/Reservation");
const Court = require("../models/Court");
const Equipment = require("../models/Equipment");
const User = require("../models/User");

const models = {
  reservations: Reservation,
  courts: Court,
  equipment: Equipment,
  users: User,
};


const canView = (type, role) =>
  type === "users" ? role === "admin" : ["staff", "admin"].includes(role);
const canManage = (type, role) => (type === "users" ? role === "admin" : role === "staff");

const ACTIVE = ["pending", "confirmed"];


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

// GET /api/archive/
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

// DELETE /api/archive/:type/:id  
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
