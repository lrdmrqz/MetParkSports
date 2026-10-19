const express = require("express");
const {
  getArchived,
  archiveRecord,
  restoreRecord,
  deletePermanently,
} = require("../controllers/archiveController");
const { protect, staffOrAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(protect, staffOrAdmin);

router.get("/:type", getArchived);
router.put("/:type/:id/archive", archiveRecord);
router.put("/:type/:id/restore", restoreRecord);
router.delete("/:type/:id", deletePermanently);

module.exports = router;
