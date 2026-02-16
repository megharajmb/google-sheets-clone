let io;

module.exports = {
    init: (server) => {
        const { Server } = require("socket.io");

        io = new Server(server, {
            cors: {
                origin: "http://localhost:5173",
                methods: ["GET", "POST"],
            },
        });

        io.on("connection", (socket) => {
            console.log("🔥 User Connected:", socket.id);

            socket.on("join-sheet", (sheetId) => {
                socket.join(sheetId);
                console.log("✅ User joined Sheet Room:", sheetId);
            });
            socket.on("cell-select", ({ sheetId, cellKey, user }) => {
                socket.to(sheetId).emit("cell-selected", {
                    cellKey,
                    user,
                });
            });


            socket.on("disconnect", () => {
                console.log("❌ User Disconnected:", socket.id);
            });
        });

        return io;
    },

    getIO: () => {
        if (!io) throw new Error("Socket not initialized!");
        return io;
    },
};
