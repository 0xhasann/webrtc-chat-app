// use a different tsconfig.browser.json to build js files for these into a single index.js file and import it in index.html
// tsconfig should have DOM lib for types
const socket = new WebSocket("ws://localhost:3001");
let pc;
let roomId = "";
let localStream;

const log = (text) => {
    const logElement = document.getElementById("log");
    if (logElement) {
        logElement.textContent += text + "\n";
    }
};

socket.onopen = () => {
    log("Socket connected");
};

socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "offer") {
        log("Received offer");
        await startMedia();
        createPeerConnection();

        await pc.setRemoteDescription(message.offer);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.send(JSON.stringify({
            type: "answer",
            roomId: roomId,
            answer
        }));
        log("Received Offer: ");

    }

    if (message.type === "answer") {
        log("Received answer");
        await pc.setRemoteDescription(message.answer);
    }

    if (message.type === "ice-candidate") {
        if (pc) {
            await pc.addIceCandidate(message.candidate);
        }
        log("ice-candidate: ");

    }
    log("Received: " + JSON.stringify(message));
};

function join() {
    const input = document.getElementById("room");
    if (!(input instanceof HTMLInputElement)) {
        log("roomId could not be empty");
        return;
    }
    roomId = input.value.trim();
    if (!roomId) {
        log("RoomId cannot be empty");
        return;
    }

    console.log("Joining room:", roomId);

    socket.send(JSON.stringify({
        type: "join",
        roomId
    }));
    log("Joined room: " + roomId);
}

function sendMsg() {
    const roomInput = document.getElementById("room");
    const messageInput = document.getElementById("msg");
    if (!(roomInput instanceof HTMLInputElement) || !(messageInput instanceof HTMLInputElement)) {
        log("Message inputs are not available");
        return;
    }

    roomId = roomInput.value;
    const message = messageInput.value;

    socket.send(JSON.stringify({
        type: "signal",
        roomId,
        data: message
    }));

    log("Sent: " + message);
}

function createPeerConnection() {
    pc = new RTCPeerConnection();
    log("Ice Candidate ");

    // send ICE
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: "ice-candidate",
                roomId: roomId,
                candidate: event.candidate
            }));
        }
    };
    // receive remote stream
    pc.ontrack = (event) => {
        const remoteVideo = document.getElementById("remoteVideo");
        if (remoteVideo instanceof HTMLVideoElement) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    // add local tracks
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });
}

async function createOffer() {
    await startMedia();
    createPeerConnection();

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.send(JSON.stringify({
        type: "offer",
        roomId: roomId,
        offer
    }));

    log("Offer sent");
}
async function startMedia() {
    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    // document.getElementById("localVideo").srcObject = localStream;
    const localVideo = document.getElementById("localVideo");
    if (localVideo instanceof HTMLVideoElement) {
        localVideo.srcObject = localStream;
    }
}

