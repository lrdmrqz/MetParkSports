const Equipment = require("../models/Equipment");
const { paginate, searchRegex } = require("../utils/paginate");

const cleanBody = (body) => {
  const { _id, __v, createdAt, updatedAt, isArchived, archivedAt, ...data } = body;
  return data;
};

// GET /api/equipment   
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

// POST /api/equipment   
const createEquipment = async (req, res) => {
  try {
    res.status(201).json(await Equipment.create(cleanBody(req.body)));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/equipment/:id   
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
