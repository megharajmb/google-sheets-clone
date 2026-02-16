const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

/**
 * ✅ Controllers
 */
const {
    createSheet,
    getMySheets,
    renameSheet,
    updateCell,
    getSheetById,
    deleteSheet,
    shareSheet,
    getSharedSheets,
    getCellHistory,
    addRow,
    addColumn,
    rollbackCell,
} = require("../controllers/sheetController");


// Protected Routes
router.post("/create", protect, createSheet);
router.get("/my", protect, getMySheets);
router.get("/shared", protect, getSharedSheets);
// ✅ Single Sheet Fetch
router.get("/:sheetId", protect, getSheetById);
router.delete("/:sheetId", protect, deleteSheet);
router.patch("/:sheetId/rename", protect, renameSheet);
router.patch("/:sheetId/cell", protect, updateCell);
// ✅ Share Sheet
router.post("/:sheetId/share", protect, shareSheet);
router.get("/:sheetId/history/:cellKey", protect, getCellHistory);
// ✅ Add Row / Column
router.patch("/:sheetId/add-row", protect, addRow);
router.patch("/:sheetId/add-col", protect, addColumn);
// ✅ Rollback Cell
router.patch("/:sheetId/rollback/:cellKey", protect, rollbackCell);

module.exports = router;
