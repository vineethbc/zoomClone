const port = process.env.PORT || 5000;
const express = require("express");
const app = express();
const server = require("http").Server(app);
const peerServer = require("peer").ExpressPeerServer(server, {
  path: "/myapp"
});

app.use("/peerjs", peerServer);

const io = require("socket.io")(server, {
  transports: ["polling"]
});
const { v4: uuidV4 } = require("uuid");
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room, port: port });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    console.log(userId + " is joining " + roomId);
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);
    socket.on("disconnect", () => {
      console.log(userId + " is leaving " + roomId);
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
    });
  });
});

server.listen(port);
