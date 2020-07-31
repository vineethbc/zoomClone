const socket = io("/");

const videoGrid = document.getElementById("video-grid");
const mainVideo = document.getElementById("main-video");

const userName = prompt("Enter username!") || "User";
const videoContainerClass = "video-container";

const peerOptions = {
  host: "/",
  path: "/peerjs/myapp",
  userName
};

const isProd = PORT == 5000;

if (isProd) {
  // production does not need this
  peerOptions["port"] = PORT;
}

const myPeer = new Peer(undefined, peerOptions);
const peerMap = new Map();
let loggedInUserId;

const myVideo = document.createElement("video");
myVideo.muted = true;
myVideo.controls = true;

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true
  })
  .then((stream) => {
    // display users video
    addVideoStream(myVideo, stream, loggedInUserId, userName);
    addAsMainVideo(loggedInUserId, stream, userName);

    myPeer.on("call", (call) => {
      call.answer(stream);

      const video = document.createElement("video");
      video.muted = true;
      const peerUserName = call.metadata.userName;
      call.on("stream", (userVideoStream) => {
        addVideoStream(
          video,
          userVideoStream,
          call.peer,
          peerUserName || call.peer
        );
      });
    });

    socket.on("user-connected", (userId, userName) => {
      setTimeout(() => {
        connectToNewUser(userId, stream, userName);
        addAsMainVideo(userId, stream, userName);
      }, 2000);
    });
  });

socket.on("user-disconnected", (userId, userName) => {
  destroyPeer(userId);
  log(userName + ": has been destroyed");
});

myPeer.on("open", (id) => {
  loggedInUserId = myPeer.id;
  socket.emit("join-room", ROOM_ID, id, userName);
});

videoGrid.addEventListener("click", (e) => {
  let target = e.target;
  if (target.classList.contains(videoContainerClass)) {
    let { userId } = target.dataset;
    let { stream, userName } = peerMap.get(userId);
    addAsMainVideo(userId, stream, userName);
  }
});

function destroyPeer(destroyUserId) {
  if (peerMap.has(destroyUserId)) {
    let peer = peerMap.get(destroyUserId);
    peer.call && peer.call.close();
    peer.parent && peer.parent.remove();
    delete peer;
    peerMap.delete(destroyUserId);
  }
  if (mainVideo.dataset.userId == destroyUserId) {
    let otherPeerId = Array.from(peerMap.keys()).find(
      (key) => key !== loggedInUserId
    );
    if (!otherPeerId || !otherPeerId.length) {
      otherPeerId = loggedInUserId;
    }
    let { stream, userName } = peerMap.get(otherPeerId);
    addAsMainVideo(otherPeerId, stream, userName);
  }
}

function connectToNewUser(peerUserId, stream, peerUserName) {
  log(peerUserName + " : " + peerUserName + " is connecting");
  const call = myPeer.call(peerUserId, stream, {
    metadata: {
      userName
    }
  });
  const video = document.createElement("video");
  video.muted = true;

  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, peerUserId, peerUserName);
  });

  call.on("close", () => {
    destroyPeer(peerUserId);
  });

  if (!peerMap.has(peerUserId)) {
    peerMap.set(peerUserId, {
      call
    });
  } else {
    peerMap.set(peerUserId, {
      ...peerMap.get(peerUserId),
      call,
      stream,
      userName: peerUserName
    });
  }
}

function addVideoStream(video, stream, userId, userName) {
  log(userName + " is being added");
  video.srcObject = stream;
  video.controls = true;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  let parent;

  if (!peerMap.has(userId) || !peerMap.get(userId).parent) {
    parent = document.createElement("div");
    parent.classList.add(videoContainerClass);
    parent.dataset.userId = userId;
    let label = document.createElement("label");
    label.innerText = userName || userId;
    parent.appendChild(label);
    parent.appendChild(video);

    let peer = {};
    if (peerMap.has(userId)) {
      peer = peerMap.get(userId);
    }
    peer = { ...peer, parent, stream, userName };
    peerMap.set(userId, peer);
  } else {
    parent = peerMap.get(userId).parent;
    parent.lastElementChild.remove();
    parent.append(video);
  }
  videoGrid.prepend(parent);
}

function addAsMainVideo(userId, stream, userName) {
  if (mainVideo.dataset.userId !== userId) {
    const video = document.createElement("video");
    video.muted = true;
    video.controls = true;
    mainVideo.innerHTML = "";
    log(userName + " is being added");
    mainVideo.dataset.userId = userId;
    video.srcObject = stream;
    video.controls = true;
    video.addEventListener("loadedmetadata", () => {
      video.play();
    });
    let label = document.createElement("label");
    label.innerText = userName || userId;
    mainVideo.appendChild(label);
    mainVideo.appendChild(video);
  }
}

function log(message) {
  if (!isProd) {
    console.log(message);
  }
}
