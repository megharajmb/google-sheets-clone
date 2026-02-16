import { useEffect, useState } from "react";
import API from "../api/axios";

export default function ShareModal({ sheetId, onClose }) {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState("");
    const [permission, setPermission] = useState("view");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await API.get("/users/all");

                // ✅ Remove logged in user from list
                const myId = localStorage.getItem("userId");

                const filtered = res.data.users.filter(
                    (u) => u._id !== myId
                );

                setUsers(filtered);
                setLoading(false);
            } catch (err) {
                console.log("Error fetching users:", err.message);
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);


    // ✅ Share Sheet API Call
    const handleShare = async () => {
        if (!selectedUser) {
            alert("Please select a user");
            return;
        }

        try {
            await API.post(`/sheets/${sheetId}/share`, {
                userId: selectedUser,
                permission,
            });

            alert("Sheet Shared Successfully ✅");
            onClose();
        } catch (err) {
            console.log("Share error:", err.message);
            alert("Share failed ❌");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white w-[400px] rounded-xl shadow-lg p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">
                        🔗 Share Sheet
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-black text-lg"
                    >
                        ✖
                    </button>
                </div>

                {loading ? (
                    <p className="text-gray-500">Loading users...</p>
                ) : (
                    <>
                        <label className="block mb-2 font-semibold">
                            Select User:
                        </label>

                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full border p-2 rounded mb-4"
                        >
                            <option value="">-- Choose User --</option>
                            {users.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.name} ({u.email})
                                </option>
                            ))}
                        </select>

                        <label className="block mb-2 font-semibold">
                            Permission:
                        </label>

                        <select
                            value={permission}
                            onChange={(e) => setPermission(e.target.value)}
                            className="w-full border p-2 rounded mb-4"
                        >
                            <option value="view">View Only</option>
                            <option value="edit">Edit Access</option>
                        </select>

                        <button
                            onClick={handleShare}
                            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
                        >
                            ✅ Share Sheet
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
