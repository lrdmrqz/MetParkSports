const Court = require("../models/Court");
const { paginate, searchRegex } = require("../utils/paginate");

const cleanBody = (body) => {
  const { _id, __v, createdAt, updatedAt, isArchived, archivedAt, ...data } = body;
  return data;
};

// GET /api/courts   
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

// GET /api/courts/:id   
const getCourtById = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court || court.isArchived) return res.status(404).json({ message: "Court not found" });
    res.json(court);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/courts  
const createCourt = async (req, res) => {
  try {
    res.status(201).json(await Court.create(cleanBody(req.body)));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/courts/:id  
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
