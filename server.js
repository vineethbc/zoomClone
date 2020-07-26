const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    //console.log(userId + " is joining " + roomId);
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);
    socket.on("disconnect", () => {
      //console.log(userId + " is leaving " + roomId);
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
    });
  });
});

server.listen(3000);

// peer server
var peerApp = express();
// … Configure Express, and register necessary route handlers
srv = peerApp.listen(3001);
peerApp.use(
  "/",
  require("peer").ExpressPeerServer(srv /* , {
    debug: true
  } */)
);
