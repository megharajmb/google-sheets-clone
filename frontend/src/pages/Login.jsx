import { useState } from "react";
import API from "../api/axios";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const res = await API.post("/auth/login", { email, password });
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("userId", res.data.user._id);
            localStorage.setItem("userName", res.data.user.name);
            localStorage.setItem("userEmail", res.data.user.email);
            navigate("/dashboard");
        } catch (err) {
            alert(err.response?.data?.message || "Error");
        }
    };

    return (
        <div className="min-h-screen flex justify-center items-center bg-gray-100">
            <form
                onSubmit={handleLogin}
                className="bg-white p-8 rounded-xl shadow-lg w-96"
            >
                <h2 className="text-2xl font-bold text-center mb-6">
                    Welcome Back 👋
                </h2>

                <input
                    type="email"
                    placeholder="Email"
                    className="w-full border p-3 rounded mb-4"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="w-full border p-3 rounded mb-4"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button className="w-full bg-green-600 text-white p-3 rounded">
                    Login
                </button>

                {/* ✅ Signup Link */}
                <p className="text-center mt-5 text-gray-600">
                    Don’t have an account?{" "}
                    <Link
                        to="/signup"
                        className="text-green-600 font-semibold hover:underline"
                    >
                        Signup
                    </Link>
                </p>
            </form>
        </div>
    );
}
