import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
import socket from "../socket";

import Navbar from "../components/Navbar";
import ShareModal from "../components/ShareModal";
import HistoryModal from "../components/historyModal";

export default function Sheet() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [rows, setRows] = useState(20);
    const [cols, setCols] = useState(10);

    const [cells, setCells] = useState({});
    const [selectedCell, setSelectedCell] = useState(null);

    const [inputValue, setInputValue] = useState("");
    const [lastValue, setLastValue] = useState("");

    const [sheetName, setSheetName] = useState("Loading...");
    const [isRenaming, setIsRenaming] = useState(false);

    const [permission, setPermission] = useState("owner");
    const [showFormulas, setShowFormulas] = useState(false);

    // ✅ Save status indicator
    const [saveStatus, setSaveStatus] = useState("saved");

    // Modals
    const [showShareModal, setShowShareModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [cellHistory, setCellHistory] = useState([]);
    const [activeEditors, setActiveEditors] = useState({});


    const getColumnName = (index) => {
        let name = "";
        while (index >= 0) {
            name = String.fromCharCode((index % 26) + 65) + name;
            index = Math.floor(index / 26) - 1;
        }
        return name;
    };

    const colLetters = Array.from({ length: cols }, (_, i) =>
        getColumnName(i)
    );

    const handleRestoreHistory = async (index) => {
        try {
            const res = await API.patch(
                `/sheets/${id}/rollback/${selectedCell}`,
                {
                    historyIndex: index,
                }
            );

            console.log("✅ Rollback Done:", res.data);

            // Update UI instantly
            setCells((prev) => ({
                ...prev,
                [selectedCell]: {
                    value: res.data.value,
                    formula: "",
                },
            }));

            // Refresh history modal
            setCellHistory(res.data.history);
            setSaveStatus("saved"); // ✅ Reset status
        } catch (err) {
            console.log("Rollback error:", err.message);
        }
    };


    /* =====================================
          ✅ LOAD SHEET DATA
    ===================================== */
    useEffect(() => {
        const fetchSheet = async () => {
            try {
                const res = await API.get(`/sheets/${id}`);

                setCells(res.data.sheet.cells || {});
                setSheetName(res.data.sheet.name);
                setPermission(res.data.permission);
                setRows(res.data.sheet.rows);
                setCols(res.data.sheet.cols);

            } catch (err) {
                console.log("Error loading sheet:", err.message);
            }
        };

        fetchSheet();
    }, [id]);

    /* =====================================
          ✅ SOCKET SETUP (ONLY ONCE)
    ===================================== */
    useEffect(() => {
        socket.emit("join-sheet", id);

        socket.on("cell-updated", (data) => {
            console.log("🔥 Live Update:", data);

            setCells((prev) => ({
                ...prev,
                [data.cell]: {
                    value: data.value,
                    formula: data.formula,
                },
            }));

            setSaveStatus("saved"); // ✅ Reset status after real-time update
        });

        socket.on("sheet-resized", (data) => {
            console.log("📏 Sheet resized:", data);

            setRows(data.rows);
            setCols(data.cols);
        });

        socket.on("cell-selected", ({ cellKey, user }) => {
            setActiveEditors((prev) => ({
                ...prev,
                [cellKey]: user,
            }));

            // Auto remove after 3 seconds
            setTimeout(() => {
                setActiveEditors((prev) => {
                    const copy = { ...prev };
                    delete copy[cellKey];
                    return copy;
                });
            }, 3000);
        });



        return () => {
            socket.off("cell-updated");
            socket.off("sheet-resized");
        };

    }, [id]);

    /* =====================================
          ✅ RENAME SHEET
    ===================================== */
    const handleRenameSheet = async () => {
        try {
            await API.patch(`/sheets/${id}/rename`, {
                name: sheetName,
            });

            setIsRenaming(false);
        } catch (err) {
            console.log("Rename error:", err.message);
        }
    };

    /* =====================================
          ✅ SAVE CELL VALUE (WITH STATUS INDICATOR)
    ===================================== */
    const handleSaveCell = async () => {
        if (!selectedCell) return;
        if (permission === "view") return;
        if (inputValue === lastValue) return;

        setSaveStatus("saving");

        try {
            const payload = { cell: selectedCell };

            if (inputValue.startsWith("=")) {
                payload.formula = inputValue;
            } else {
                payload.value = inputValue;
            }
            await API.patch(`/sheets/${id}/cell`, payload);
            setCells((prev) => ({
                ...prev,
                [selectedCell]: {
                    value: inputValue.startsWith("=")
                        ? prev[selectedCell]?.value
                        : inputValue,
                    formula: inputValue.startsWith("=") ? inputValue : "",
                },
            }));

            setLastValue(inputValue);
            setSaveStatus("saved");

            console.log("✅ Cell saved instantly");
        } catch (err) {
            console.log("Error saving cell:", err.message);
            setSaveStatus("unsaved");
        }
    };

    /* =====================================
          ✅ SELECT CELL
    ===================================== */
    const handleSelectCell = async (cellKey) => {
        // Auto-save previous cell before switching
        if (selectedCell && inputValue !== lastValue) {
            await handleSaveCell();
        }

        const currentVal =
            cells[cellKey]?.formula || cells[cellKey]?.value || "";

        setSelectedCell(cellKey);
        socket.emit("cell-select", {
            sheetId: id,
            cellKey,
            user: localStorage.getItem("userName") || "Someone",
        });

        setInputValue(currentVal);
        setLastValue(currentVal);
        setSaveStatus("saved"); // ✅ Reset status when selecting a new cell
    };

    /* =====================================
          ✅ FETCH CELL HISTORY
    ===================================== */
    const fetchCellHistory = async () => {
        if (!selectedCell) {
            alert("Select a cell first!");
            return;
        }

        try {
            const res = await API.get(`/sheets/${id}/history/${selectedCell}`);

            setCellHistory(res.data.history);
            setShowHistoryModal(true);
        } catch (err) {
            console.log("History error:", err.message);
        }
    };

    const exportCSV = () => {
        let csv = "";

        for (let r = 1; r <= rows; r++) {
            let rowData = [];

            for (let c = 0; c < cols; c++) {
                const cellKey = `${colLetters[c]}${r}`;
                const value = cells[cellKey]?.value || "";

                const safeValue = `"${String(value).replace(/"/g, '""')}"`;

                rowData.push(safeValue);
            }

            csv += rowData.join(",") + "\n";
        }

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${sheetName}.csv`;
        a.click();

        window.URL.revokeObjectURL(url);
    };
    /* =====================================
          ✅ UI
    ===================================== */
    return (
        <div className="min-h-screen bg-gray-100">
            {/* ✅ NAVBAR */}
            <Navbar
                title="Google Sheets Clone"
                rightButton={
                    <div className="flex gap-3">
                        {/* Dashboard */}
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                        >
                            Dashboard
                        </button>

                        {/* History */}
                        <button
                            onClick={fetchCellHistory}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                        >
                            🕒 History
                        </button>
                        <button
                            onClick={() => setShowFormulas((prev) => !prev)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                        >
                            {showFormulas ? "🔢 Values" : "🧮 Formulas"}
                        </button>


                        {/* Share */}
                        {permission === "owner" && (
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                            >
                                🔗 Share
                            </button>
                        )}
                        {permission !== "view" && (
                            <>
                                <button
                                    onClick={async () => {
                                        await API.patch(`/sheets/${id}/add-row`);
                                    }}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                                >
                                    ➕ Row
                                </button>

                                <button
                                    onClick={async () => {
                                        await API.patch(`/sheets/${id}/add-col`);
                                    }}
                                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
                                >
                                    ➕ Column
                                </button>
                            </>
                        )}
                        <button
                            onClick={exportCSV}
                            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
                        >
                            ⬇ Export CSV
                        </button>
                    </div>
                }
            />

            {/* ✅ TOP BAR */}
            <div className="bg-white shadow-sm px-6 py-3 flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <div>
                        {isRenaming ? (
                            <input
                                value={sheetName}
                                onChange={(e) => setSheetName(e.target.value)}
                                onBlur={handleRenameSheet}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameSheet();
                                }}
                                autoFocus
                                className="border px-2 py-1 rounded font-semibold"
                            />
                        ) : (
                            <h2
                                onClick={() => permission !== "view" && setIsRenaming(true)}
                                className="text-lg font-bold text-green-600 cursor-pointer hover:underline"
                            >
                                {sheetName}
                            </h2>
                        )}
                        <p className="text-xs text-gray-400">Click name to rename</p>
                    </div>
                    {/* ✅ SAVE STATUS INDICATOR - Only show when editing */}
                    {selectedCell && (
                        <div className="flex items-center gap-2">
                            {saveStatus === "saved" && inputValue === lastValue && (
                                <span className="text-sm text-green-600 flex items-center gap-1">
                                    ✅ Saved
                                </span>
                            )}
                            {saveStatus === "saving" && (
                                <span className="text-sm text-blue-600 flex items-center gap-1 animate-pulse">
                                    💾 Saving...
                                </span>
                            )}
                            {saveStatus === "unsaved" && (
                                <span className="text-sm text-orange-600 flex items-center gap-1">
                                    ⚠️ Unsaved
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Formula Bar */}
                <input
                    value={inputValue}
                    disabled={permission === "view"}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        if (e.target.value !== lastValue) {
                            setSaveStatus("unsaved");
                        }
                    }}
                    className="flex-1 border px-3 py-2 rounded-lg disabled:bg-gray-100"
                    placeholder="Enter value or formula..."
                />

                {/* Selected Cell */}
                <span className="text-sm text-gray-600 font-semibold">
                    Selected: {selectedCell || "None"}
                </span>
            </div>
            {permission === "view" && (
                <div className="bg-yellow-100 text-yellow-800 text-center py-2 font-semibold">
                    👀 View Only Mode — Editing Disabled
                </div>
            )}
            <div className="overflow-auto p-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <table className="border-collapse">
                    <thead>
                    <tr>
                        <th className="w-12 h-10 bg-gray-200 border sticky left-0 z-10"></th>
                        {colLetters.map((col) => (
                            <th
                                key={col}
                                className="min-w-[80px] h-10 bg-gray-200 border text-center font-bold text-xs"
                                style={{minWidth: '80px'}}
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {Array.from({length: rows}, (_, r) => (
                        <tr key={r}>
                            <td className="bg-gray-200 border text-center font-bold w-12 sticky left-0 z-10">
                                {r + 1}
                            </td>
                            {colLetters.map((col) => {
                                const cellKey = `${col}${r + 1}`;
                                return (
                                    <td
                                        key={cellKey}
                                        onClick={() => handleSelectCell(cellKey)}
                                        className={`border min-w-[80px] h-10 cursor-pointer text-center relative ${
                                            selectedCell === cellKey
                                                ? "bg-green-100 border-green-500"
                                                : "bg-white"
                                        }`}
                                        style={{minWidth: '80px'}}
                                    >
                                        {activeEditors[cellKey] && (
                                            <span
                                                className="absolute top-0 left-0 text-[10px] bg-red-500 text-white px-1 rounded">
                                        ✍{activeEditors[cellKey]}
                                            </span>
                                        )}
                                        {selectedCell === cellKey && permission !== "view" ? (
                                            <input
                                                autoFocus
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                onBlur={handleSaveCell}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleSaveCell();
                                                }}
                                                className="w-full h-full text-center outline-none bg-transparent"
                                            />
                                        ) : (
                                            showFormulas
                                                ? cells[cellKey]?.formula || cells[cellKey]?.value || ""
                                                : cells[cellKey]?.value || ""

                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            {/* SHARE MODAL */}
            {showShareModal && (
                <ShareModal sheetId={id} onClose={() => setShowShareModal(false)} />
            )}

            {/* HISTORY MODAL */}
            {showHistoryModal && (
                <HistoryModal
                    cell={selectedCell}
                    history={cellHistory}
                    onClose={() => setShowHistoryModal(false)}
                    onRestore={handleRestoreHistory}
                />
            )}
        </div>
    );
}