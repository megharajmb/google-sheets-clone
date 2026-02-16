import { useNavigate } from "react-router-dom";

export default function Navbar({ title, rightButton }) {
    const navigate = useNavigate();

    const userName = localStorage.getItem("userName");
    const userEmail = localStorage.getItem("userEmail");

    const handleLogout = () => {
        localStorage.clear();
        navigate("/");
    };

    return (
        <div className="bg-white shadow-md px-6 py-4 flex justify-between items-center">

            <h1 className="text-2xl font-bold text-green-600">
                {title || "Google Sheets Clone"}
            </h1>
            <div className="text-sm text-gray-600 text-center">
                <p className="font-semibold">{userName}</p>
                <p className="text-gray-400">{userEmail}</p>
            </div>
            <div className="flex items-center gap-3">
                {rightButton}
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                >
                    🚪 Logout
                </button>
            </div>
        </div>
    );
}
