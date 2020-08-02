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

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true
  })
  .then((stream) => {
    loggedInUserId = myPeer.id;
    addVideoStream(stream, loggedInUserId, userName);
    addAsMainVideo(loggedInUserId, stream, userName);

    myPeer.on("call", (call) => {
      call.answer(stream);
      const peerUserName = call.metadata.userName;
      call.on("stream", (userVideoStream) => {
        addVideoStream(userVideoStream, call.peer, peerUserName || call.peer);
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
  socket.emit("join-room", ROOM_ID, id, userName);
});

videoGrid.addEventListener("click", (e) => {
  let target = e.target;
  let isUserLabel = target.classList.contains("user-label");
  if (isUserLabel || target.parentElement.classList.contains("user-label")) {
    let videoContainer = isUserLabel
      ? target.parentElement
      : target.parentElement.parentElement;
    let { userId } = videoContainer.dataset;
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
  call.on("stream", (userVideoStream) => {
    addVideoStream(userVideoStream, peerUserId, peerUserName);
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

function addVideoStream(stream, userId, userName) {
  log(userName + " is being added");
  let video = generateVideoElement(stream);
  let parent;

  if (!peerMap.has(userId) || !peerMap.get(userId).parent) {
    parent = generateVideoContainer(userId, video, userName);
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
    const video = generateVideoElement(stream);
    mainVideo.innerHTML = "";
    log(userName + " is being added");
    mainVideo.dataset.userId = userId;
    generateVideoContainer(userId, video, userName, mainVideo);
  }
}

function log(message) {
  if (!isProd) {
    console.log(message);
  }
}

function generateVideoElement(stream) {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.controls = true;
  video.muted = true;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  return video;
}

function generateVideoContainer(userId, video, userName, parentElement) {
  let parent = parentElement || document.createElement("div");
  if (!parentElement) {
    parent.classList.add(
      videoContainerClass,
      "col-sm-4",
      "col-lg-3",
      "col-md-6"
    );
  }
  parent.dataset.userId = userId;
  let cardDiv = document.createElement("div");
  cardDiv.classList.add("card", "h-100", "center-content", "mb-1");
  let labelParent = document.createElement("div");
  labelParent.classList.add("user-label");
  let label = document.createElement("label");
  label.innerText = userName || userId;
  labelParent.appendChild(label);
  cardDiv.appendChild(labelParent);
  cardDiv.appendChild(video);
  parent.appendChild(cardDiv);
  return parent;
}
