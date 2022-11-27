const peerConnections = {};
const config = {
  iceServers: [
    {  "urls": "stun:stun.l.google.com:19302" }
  ]
};

const broadcast = document.getElementById('broadcast');
const videoElement = document.querySelector("video");
const server = document.getElementById('server');

let socket = null;

server.value = window.location.host;
broadcast.addEventListener('click', e => {
  getStream()
  .then(getDevices)
  .then(gotDevices)
  .catch(handleError);

  socket = io.connect(server.value);

  socket.on("answer", (id, description) => {
    peerConnections[id].setRemoteDescription(description);
  });
  
  socket.on("watcher", id => {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[id] = peerConnection;
  
    let stream = videoElement.srcObject;
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
  
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit("candidate", id, event.candidate);
      }
    };
  
    peerConnection
      .createOffer()
      .then(sdp => peerConnection.setLocalDescription(sdp))
      .then(() => {
        socket.emit("offer", id, peerConnection.localDescription);
      });
  });
  
  socket.on("candidate", (id, candidate) => {
    peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
  });
  
  socket.on("disconnectPeer", id => {
    peerConnections[id].close();
    delete peerConnections[id];
  });
});


window.onunload = window.onbeforeunload = () => {
  socket.close();
};


function getDevices() {
  return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos) {
  window.deviceInfos = deviceInfos;
}

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  
  if(navigator?.mediaDevices?.getDisplayMedia){
    return navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: { echoCancellation: false } })
      .then(gotStream)
      .catch(handleError);
  }else{
    return navigator.getDisplayMedia({ video: true, audio: { echoCancellation: false } })
    .then(gotStream)
    .catch(handleError);
  }
}

function gotStream(stream) {
  window.stream = stream;

  videoElement.srcObject = stream;
  socket.emit("broadcaster");
}

function handleError(error) {
  alert("there's an error " + error.name)
  console.error("Error: ", error);
}