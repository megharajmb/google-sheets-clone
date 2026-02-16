const express = require("express");
const cors = require("cors");
const http = require("http");

const connectDB = require("./config/db");
const socket = require("./socket");

const authRoutes = require("./routes/authRoutes");
const sheetRoutes = require("./routes/sheetRoutes");
const userRoutes = require("./routes/userRoutes");

const protect = require("./middleware/authMiddleware");

require("dotenv").config();

const app = express();
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sheets", sheetRoutes);

// Test Route
app.get("/api/test", protect, (req, res) => {
    res.json({
        message: "Protected route working ✅",
        user: req.user,
    });
});

// Default Route
app.get("/", (req, res) => {
    res.send("Backend is running successfully!");
});

/* ======================================
        ✅ SOCKET SERVER
====================================== */

const server = http.createServer(app);

// ✅ Initialize Socket Properly
socket.init(server);

/* ======================================
        ✅ START SERVER
====================================== */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log("Server + Socket running on port", PORT);
});
