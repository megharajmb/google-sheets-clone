import { useState } from "react";
import API from "../api/axios";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const navigate = useNavigate();
    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            await API.post("/auth/signup", { name, email, password });

            alert("Signup successful ✅");
            navigate("/");
        } catch (err) {
            alert(err.response?.data?.message || "Error");
        }
    };
    return (
        <div className="min-h-screen flex justify-center items-center bg-gray-100">
            <form
                onSubmit={handleSignup}
                className="bg-white p-8 rounded-xl shadow-lg w-96"
            >
                <h2 className="text-2xl font-bold text-center mb-6">
                    Create Account ✨
                </h2>
                <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full border p-3 rounded mb-4"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

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
                    Signup
                </button>

                {/* ✅ Login Link */}
                <p className="text-center mt-5 text-gray-600">
                    Already have an account?{" "}
                    <Link
                        to="/"
                        className="text-green-600 font-semibold hover:underline"
                    >
                        Login
                    </Link>
                </p>
            </form>
        </div>
    );
}
