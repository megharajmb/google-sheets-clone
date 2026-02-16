export default function HistoryModal({ cell, history, onClose, onRestore }) {

    console.log(history," this is the history")
    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white w-[500px] rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-purple-700 mb-4">
                    🕒 History for Cell {cell}
                </h2>

                {history.length === 0 ? (
                    <p className="text-gray-500">No edits yet for this cell.</p>
                ) : (
                    <div className="max-h-72 overflow-y-auto space-y-3">
                        {history.map((h, index) => (
                            <div
                                key={index}
                                className="border rounded-lg p-3 bg-gray-50"
                            >
                                {/* ✅ Support old + new history */}
                                <p className="text-sm font-semibold text-gray-700">
                                    Edited By:{" "}
                                    {h.editedByName || h.editedBy || "Unknown User"}
                                </p>

                                {/* Email only if exists */}
                                {h.editedByEmail && (
                                    <p className="text-xs text-gray-400">
                                        ({h.editedByEmail})
                                    </p>
                                )}

                                <p className="text-sm text-gray-600">
                                    {h.oldValue} →{" "}
                                    <span className="font-bold">{h.newValue}</span>
                                </p>

                                <p className="text-xs text-gray-400">
                                    {new Date(h.timestamp).toLocaleString()}
                                </p>
                                <button
                                    onClick={() => onRestore(index)}
                                    className="mt-2 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                >
                                    🔄 Restore
                                </button>

                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="mt-5 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
