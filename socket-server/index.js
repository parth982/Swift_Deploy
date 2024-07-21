require("dotenv").config();

const { Server } = require("socket.io");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.SOCKET_SERVER_PORT || 9002;
const CORS_ORIGIN = process.env.FRONTEND_ORIGIN;

app.use(cors({ origin: FRONTEND_ORIGIN }));

app.use(express.json());

const httpServer = app.listen(PORT, () =>
  console.log(`Socket Server running on port ${PORT}`)
);

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
});

app.post("/redis-message", (req, res) => {
  const { channel, message } = req.body;
  io.to(channel).emit("message", message);
  res.sendStatus(200);
});
