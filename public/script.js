const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const peerOptions = {
  host: "/",
  path: "/peerjs/myapp"
};

if (PORT == 5000) {
  // production does not need this
  peerOptions["port"] = PORT;
}

const myPeer = new Peer(undefined, peerOptions);

const myVideo = document.createElement("video");
myVideo.muted = true;

const peers = {};

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true
  })
  .then((stream) => {
    addVideoStream(myVideo, stream, "Self");

    myPeer.on("call", (call) => {
      call.answer(stream);

      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, call.peer);
      });
    });

    socket.on("user-connected", (userId) => {
      setTimeout(() => {
        connectToNewUser(userId, stream);
      }, 2000);
    });
  });

socket.on("user-disconnected", (userId) => {
  destroyPeer(userId);
});

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

function destroyPeer(userId) {
  if (peers[userId]) {
    peers[userId].call && peers[userId].call.close();
    peers[userId].parent && peers[userId].parent.remove();
    delete peers[userId];
  }
}

function connectToNewUser(userId, stream) {
  console.log(userId + " is connecting");
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");

  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId);
  });

  call.on("close", () => {
    destroyPeer(userId);
  });

  if (!peers[userId]) {
    peers[userId] = {};
  }
  peers[userId].call = call;
}

function addVideoStream(video, stream, userId) {
  console.log(userId + " is being added");
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  let parent;
  if (!peers[userId] || !peers[userId].parent) {
    parent = document.createElement("div");
    let label = document.createElement("label");
    label.innerText = userId;
    parent.appendChild(label);
    parent.appendChild(video);
    peers[userId] = {};
    peers[userId].parent = parent;
  } else {
    parent = peers[userId].parent;
    parent.append(video);
  }
  videoGrid.append(parent);
}
