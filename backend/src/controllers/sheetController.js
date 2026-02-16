const Sheet = require("../models/Sheet");
const evaluateFormula = require("../utils/formulaEngine");
const socket = require("../socket");


/* ============================================================
   ✅ CREATE NEW SHEET
============================================================ */
exports.createSheet = async (req, res) => {
    try {
        const { rows, cols } = req.body;

        if (!rows || !cols) {
            return res.status(400).json({
                message: "Rows and Columns are required",
            });
        }

        const sheet = await Sheet.create({
            ownerId: req.user.id,
            rows,
            cols,
            name: "New Sheet",
            cells: {},
        });

        res.status(201).json({
            message: "Sheet created successfully ✅",
            sheet,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ============================================================
   ✅ GET MY SHEETS
============================================================ */
exports.getMySheets = async (req, res) => {
    try {
        const sheets = await Sheet.find({ ownerId: req.user.id });

        res.json({
            message: "My sheets fetched ✅",
            sheets,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
/* ============================================================
   🔧 HELPER: RECALCULATE ALL FORMULAS
============================================================ */
const recalculateFormulas = (sheet) => {
    let changed = true;
    let maxLoops = 10;
    let loopCount = 0;

    while (changed && loopCount < maxLoops) {
        changed = false;
        loopCount++;

        sheet.cells.forEach((cellData, key) => {
            if (cellData.formula && cellData.formula.startsWith("=")) {
                const newVal = evaluateFormula(cellData.formula, sheet.cells);

                // Convert to string for comparison (since DB stores as string)
                const newValStr = String(newVal);
                const currentValStr = String(cellData.value);

                if (currentValStr !== newValStr) {
                    console.log(`🔄 Recalculating ${key}: ${currentValStr} → ${newValStr}`);

                    // IMPORTANT: Create a new object to trigger Mongoose change detection
                    const updatedCell = {
                        value: newValStr,
                        formula: cellData.formula,
                        history: cellData.history || [],
                        _id: cellData._id
                    };

                    sheet.cells.set(key, updatedCell);
                    changed = true;
                }
            }
        });
    }
};


/* ============================================================
   ✅ GET SINGLE SHEET BY ID (WITH PERMISSION)
============================================================ */
exports.getSheetById = async (req, res) => {
    try {
        const { sheetId } = req.params;

        const sheet = await Sheet.findById(sheetId);

        if (!sheet) {
            return res.status(404).json({
                message: "Sheet not found",
            });
        }

        // Default permission
        let permission = "owner";

        // Shared user permission
        if (sheet.ownerId.toString() !== req.user.id) {
            const sharedUser = sheet.sharedWith.find(
                (u) => u.userId.toString() === req.user.id
            );

            if (!sharedUser) {
                return res.status(403).json({
                    message: "You do not have access to this sheet",
                });
            }

            permission = sharedUser.permission;
        }
        /* ============================================================
           ✅ RE-EVALUATE ALL FORMULAS ON FETCH
        ============================================================ */
        recalculateFormulas(sheet);

        // CRITICAL: Mark the entire cells map as modified
        sheet.markModified("cells");

        // Save to database
        await sheet.save();

        res.json({
            message: "Sheet fetched successfully ✅",
            sheet: {
                ...sheet.toObject(),
                cells: Object.fromEntries(sheet.cells),
            },
            permission,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
/* ============================================================
   ✅ RENAME SHEET
============================================================ */
exports.renameSheet = async (req, res) => {
    try {
        const { sheetId } = req.params;
        const { name } = req.body;

        const sheet = await Sheet.findById(sheetId);

        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        if (sheet.ownerId.toString() !== req.user.id)
            return res.status(403).json({ message: "Not allowed" });

        sheet.name = name;
        await sheet.save();

        res.json({
            message: "Sheet renamed successfully ✅",
            sheet,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ============================================================
   ✅ UPDATE CELL + HISTORY + REALTIME + FORMULA RECALC
============================================================ */
exports.updateCell = async (req, res) => {
    try {
        const { sheetId } = req.params;
        const { cell, value, formula } = req.body;

        const sheet = await Sheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        /* ---------------- Permission Check ---------------- */
        if (sheet.ownerId.toString() !== req.user.id) {
            const sharedUser = sheet.sharedWith.find(
                (u) => u.userId.toString() === req.user.id
            );

            if (!sharedUser || sharedUser.permission !== "edit") {
                return res.status(403).json({
                    message: "View-only users cannot edit ❌",
                });
            }
        }

        /* ---------------- Old Cell Data ---------------- */
        const oldCellData = sheet.cells.get(cell);
        const oldValue = oldCellData?.value || "";

        /* ---------------- Compute Final Value ---------------- */
        let finalValue = value || "";

        if (formula && formula.startsWith("=")) {
            finalValue = evaluateFormula(formula, sheet.cells);
        }

        /* ---------------- Save Edited Cell + History ---------------- */
        sheet.cells.set(cell, {
            value: finalValue,
            formula: formula || "",
            history: [
                ...(oldCellData?.history || []),
                {
                    editedByName: req.user.name,
                    editedByEmail: req.user.email,
                    oldValue,
                    newValue: finalValue,
                    timestamp: new Date(),
                },
            ],
        });

        /* ============================================================
           ✅ AUTO RECALCULATE DEPENDENT FORMULAS (MULTI LEVEL)
        ============================================================ */
        let updatedFormulaCells = [];

        // Use the same recalculateFormulas function we created
        recalculateFormulas(sheet);

        // Collect all cells that have formulas for broadcasting
        sheet.cells.forEach((cellData, key) => {
            if (cellData.formula && cellData.formula.startsWith("=")) {
                updatedFormulaCells.push({
                    cell: key,
                    value: cellData.value,
                    formula: cellData.formula,
                });
            }
        });

        /* ============================================================
           ✅ VERY IMPORTANT FIX (PERSIST FORMULAS AFTER REFRESH)
        ============================================================ */
        sheet.markModified("cells");

        await sheet.save();

        /* ============================================================
           ✅ REALTIME BROADCAST
        ============================================================ */
        const io = socket.getIO();

        // Broadcast edited cell
        io.to(sheetId).emit("cell-updated", {
            cell,
            value: finalValue,
            formula: formula || "",
        });

        // Broadcast all recalculated formula cells
        updatedFormulaCells.forEach((fCell) => {
            io.to(sheetId).emit("cell-updated", fCell);
        });

        res.json({
            message: "Cell updated successfully ✅",
            sheet: {
                ...sheet.toObject(),
                cells: Object.fromEntries(sheet.cells),
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ============================================================
   ✅ CELL HISTORY
============================================================ */
exports.getCellHistory = async (req, res) => {
    try {
        const { sheetId, cellKey } = req.params;

        const sheet = await Sheet.findById(sheetId);

        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        const cellData = sheet.cells.get(cellKey);

        res.json({
            message: "Cell history fetched ✅",
            history: cellData?.history || [],
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ============================================================
   ✅ ROLLBACK CELL HISTORY
============================================================ */
exports.rollbackCell = async (req, res) => {
    try {
        const { sheetId, cellKey } = req.params;
        const { historyIndex } = req.body;

        const sheet = await Sheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        const cellData = sheet.cells.get(cellKey);

        if (!cellData || !cellData.history)
            return res.status(400).json({ message: "No history available" });

        const selectedHistory = cellData.history[historyIndex];

        if (!selectedHistory)
            return res.status(400).json({ message: "Invalid history index" });

        const rollbackValue = selectedHistory.newValue;
        const oldValue = cellData.value;

        cellData.value = rollbackValue;

        cellData.history.push({
            editedByName: req.user.name,
            editedByEmail: req.user.email,
            oldValue,
            newValue: rollbackValue,
            timestamp: new Date(),
        });

        sheet.cells.set(cellKey, cellData);

        sheet.markModified("cells");
        await sheet.save();

        const io = socket.getIO();

        io.to(sheetId).emit("cell-updated", {
            cell: cellKey,
            value: rollbackValue,
            formula: "",
        });

        res.json({
            message: "Rollback successful ✅",
            cell: cellKey,
            value: rollbackValue,
            history: cellData.history,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ============================================================
   ✅ ADD ROW / COLUMN
============================================================ */
exports.addRow = async (req, res) => {
    try {
        const { sheetId } = req.params;

        const sheet = await Sheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        sheet.rows += 1;
        await sheet.save();

        const io = socket.getIO();
        io.to(sheetId).emit("sheet-resized", {
            rows: sheet.rows,
            cols: sheet.cols,
        });

        res.json({
            message: "Row added successfully ✅",
            sheet,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.addColumn = async (req, res) => {
    try {
        const { sheetId } = req.params;

        const sheet = await Sheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        sheet.cols += 1;
        await sheet.save();

        const io = socket.getIO();
        io.to(sheetId).emit("sheet-resized", {
            rows: sheet.rows,
            cols: sheet.cols,
        });

        res.json({
            message: "Column added successfully ✅",
            sheet,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ============================================================
   ✅ SHARE SHEET
============================================================ */
exports.shareSheet = async (req, res) => {
    try {
        const { sheetId } = req.params;
        const { userId, permission } = req.body;

        const sheet = await Sheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        const alreadyShared = sheet.sharedWith.find(
            (u) => u.userId.toString() === userId
        );

        if (alreadyShared) {
            alreadyShared.permission = permission;
        } else {
            sheet.sharedWith.push({ userId, permission });
        }

        await sheet.save();

        res.json({
            message: "Sheet shared successfully ✅",
            sheet,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ============================================================
   ✅ GET SHARED SHEETS
============================================================ */
exports.getSharedSheets = async (req, res) => {
    try {
        const sheets = await Sheet.find({
            "sharedWith.userId": req.user.id,
        });

        res.json({
            message: "Shared sheets fetched ✅",
            sheets,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ============================================================
   ✅ DELETE SHEET
============================================================ */
exports.deleteSheet = async (req, res) => {
    try {
        const { sheetId } = req.params;

        const sheet = await Sheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        if (sheet.ownerId.toString() !== req.user.id)
            return res.status(403).json({ message: "Not allowed" });

        await sheet.deleteOne();

        res.json({ message: "Sheet deleted successfully ✅" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
