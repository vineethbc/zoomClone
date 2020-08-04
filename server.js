const express = require("express");
const app = express();
const server = require("http").Server(app);
const peerServer = require("peer").ExpressPeerServer(server, {
  path: "/myapp"
});

const localPort = 5000;
const port = process.env.PORT || localPort;
const isProd = port == localPort;

app.use("/peerjs", peerServer);

const io = require("socket.io")(server, {
  transports: ["polling"]
});
const { v4: uuidV4 } = require("uuid");
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/room-${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  let viewOptions = { roomId: req.params.room };
  if (port === localPort) {
    viewOptions["port"] = localPort;
  } else {
    viewOptions["port"] = "";
  }
  res.render("room", viewOptions);
});

io.on("connection", (socket) => {
  log("************ io connection established **************");
  peerServer.on("connection", (client) => {
    log("************ peerserver connected ************ ");
    socket.on("join-room", (roomId, userId, userName) => {
      log(
        "***************** " +
          userId +
          " : " +
          userName +
          " is joining " +
          roomId +
          " ****************"
      );
      socket.join(roomId);
      socket.to(roomId).broadcast.emit("user-connected", userId, userName);
      socket.on("disconnect", () => {
        log(
          "***************** " +
            userId +
            " : " +
            userName +
            " is leaving " +
            roomId +
            " *****************"
        );
        socket.to(roomId).broadcast.emit("user-disconnected", userId, userName);
      });
    });
  });

  peerServer.on("disconnect", (client) => {
    let { id } = client;
    log("****** peer " + id + " disconnected*********");
  });
});

server.listen(port);

function log(message) {
  if (!isProd) {
    console.log(message);
  }
}
