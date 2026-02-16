import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import Navbar from "../components/Navbar";

export default function Dashboard() {
    const navigate = useNavigate();

    const [sheets, setSheets] = useState([]);
    const [sharedSheets, setSharedSheets] = useState([]);
    const [loading, setLoading] = useState(true);

    // ✅ NEW: Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRows, setNewRows] = useState(20);
    const [newCols, setNewCols] = useState(10);

    // Fetch My Sheets
    const fetchSheets = async () => {
        try {
            const res = await API.get("/sheets/my");
            setSheets(res.data.sheets);
            setLoading(false);
        } catch (err) {
            console.log("Error fetching sheets:", err.message);
            setLoading(false);
        }
    };

    // Fetch Shared Sheets
    const fetchSharedSheets = async () => {
        try {
            const res = await API.get("/sheets/shared");
            setSharedSheets(res.data.sheets);
        } catch (err) {
            console.log("Error fetching shared sheets:", err.message);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/");
            return;
        }
        fetchSheets();
        fetchSharedSheets();
    }, []);

    const handleCreateSheet = async () => {
        try {
            const res = await API.post("/sheets/create", {
                rows: newRows,
                cols: newCols,
            });

            setShowCreateModal(false);
            navigate(`/sheet/${res.data.sheet._id}`);
        } catch (err) {
            console.log("Create sheet error:", err.message);
        }
    };

    // Delete Sheet
    const handleDeleteSheet = async (sheetId) => {
        try {
            await API.delete(`/sheets/${sheetId}`);
            setSheets((prev) => prev.filter((s) => s._id !== sheetId));
        } catch (err) {
            console.log("Delete error:", err.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* ✅ Navbar */}
            <Navbar
                title="📄 My Sheets Dashboard"
                rightButton={
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                        ➕ Create Sheet
                    </button>
                }
            />

            <div className="p-8">
                {/* My Sheets */}
                <h2 className="text-xl font-bold mb-4 text-gray-800">My Sheets</h2>

                {loading ? (
                    <p className="text-gray-600">Loading sheets...</p>
                ) : sheets.length === 0 ? (
                    <p className="text-gray-500">No sheets created yet 🚀</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sheets.map((sheet) => (
                            <div
                                key={sheet._id}
                                onClick={() => navigate(`/sheet/${sheet._id}`)}
                                className="bg-white p-5 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition"
                            >
                                <h2 className="text-lg font-semibold text-gray-800">
                                    {sheet.name}
                                </h2>

                                <p className="text-sm text-gray-500 mt-2">
                                    Rows: {sheet.rows} | Cols: {sheet.cols}
                                </p>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSheet(sheet._id);
                                    }}
                                    className="mt-4 text-red-500 text-sm hover:underline"
                                >
                                    🗑 Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Shared Sheets */}
                <h2 className="text-xl font-bold text-blue-600 mt-12 mb-4">
                    🤝 Shared With Me
                </h2>

                {sharedSheets.length === 0 ? (
                    <p className="text-gray-500">No sheets shared with you yet</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sharedSheets.map((sheet) => (
                            <div
                                key={sheet._id}
                                onClick={() => navigate(`/sheet/${sheet._id}`)}
                                className="bg-white p-5 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition"
                            >
                                <h2 className="text-lg font-semibold text-gray-800">
                                    {sheet.name}
                                </h2>

                                <p className="text-sm text-gray-500 mt-2">Shared Sheet</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ============================================================
                ✅ CREATE SHEET MODAL
            ============================================================ */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-8 w-96">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                            📊 Create New Sheet
                        </h2>

                        {/* Rows Input */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Number of Rows
                            </label>
                            <input
                                type="number"
                                value={newRows}
                                onChange={(e) => setNewRows(Number(e.target.value))}
                                min="1"
                                max="100"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        {/* Columns Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Number of Columns
                            </label>
                            <input
                                type="number"
                                value={newCols}
                                onChange={(e) => setNewCols(Number(e.target.value))}
                                min="1"
                                max="26"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCreateSheet}
                                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold"
                            >
                                ✅ Create
                            </button>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition font-semibold"
                            >
                                ❌ Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}