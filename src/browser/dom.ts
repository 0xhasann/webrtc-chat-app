// expose methods to do the following via changing the document
// displaying local stream
// displaying remote stream
// display state changes for icegathering, iceconnection, signaling state
// add methods to
// implement login that html calls
// show active users on userlistbox html ul
// add send call next to each user on user list
// show accept when an call is received from server for the given caller name in user list
// hangup button

import type { Name } from "../shared/chatmessage";
import { RTCPeerConnectionHandler } from "./webrtcEventHandler";
import { WebSocketHandler } from "./websocketHandler";

export function login() {
    const ws = WebSocketHandler.getInstance();
    const username = getUserName();
    if (!username) {
        alert("Name not set");
        return;
    }
    ws.login(username);
}

export function renderUserList(data: { names: Name[] }) {
    const ws = WebSocketHandler.getInstance();
    const userListDiv = document.getElementById("user-list");
    if (!userListDiv) {
        console.log("userListDiv not found");
        return;
    }

    userListDiv.innerHTML = "";

    const ul = document.createElement("ul");
    data.names.forEach((name: string) => {
        if (ws.myUserName == name) return;
        const li = document.createElement("li");

        const nameSpan = document.createElement("span");
        nameSpan.textContent = name;

        const callBtn = document.createElement("button");
        callBtn.textContent = "Call";
        callBtn.addEventListener("click", () => {
            ws.call(name);
            callBtn.textContent = "Calling...";
            callBtn.disabled = true;
        });

        li.appendChild(nameSpan);
        li.appendChild(document.createTextNode(" "));
        li.appendChild(callBtn);

        ul.appendChild(li);
    });

    userListDiv.appendChild(ul);
}

export function renderIncomingCall(data: { name: Name }) {
    const ws = WebSocketHandler.getInstance();
    const userListDiv = document.getElementById("user-list");
    if (!userListDiv) return;

    let prevPrompt = document.getElementById("incoming-call-prompt");
    if (prevPrompt) prevPrompt.remove();

    const promptDiv = document.createElement("div");
    promptDiv.id = "incoming-call-prompt";
    promptDiv.style.margin = "8px 0";

    const message = document.createElement("span");
    message.textContent = `Incoming call from ${data.name}.`;

    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = "Accept";
    acceptBtn.addEventListener("click", () => {
        ws.accept(data.name);
        promptDiv.remove();
        const userListDiv = document.getElementById("user-list");
        if (userListDiv) {
            const callButtons = userListDiv.querySelectorAll("button");
            callButtons.forEach((btn) => {
                const li = btn.closest("li");
                if (li) {
                    const span = li.querySelector("span");
                    if (span && span.textContent === data.name) {
                        btn.textContent = "Call";
                        btn.disabled = true;
                    }
                }
            });
        }
    });

    promptDiv.appendChild(message);
    promptDiv.appendChild(document.createTextNode(" "));
    promptDiv.appendChild(acceptBtn);
    userListDiv.parentElement?.insertBefore(promptDiv, userListDiv);
}

export function disableCallButton(name: Name) {
    const userListDiv = document.getElementById("user-list");
    if (userListDiv) {
        const callButtons = userListDiv.querySelectorAll("button");
        callButtons.forEach((btn) => {
            const li = btn.closest("li");
            if (li) {
                const span = li.querySelector("span");
                if (span && span.textContent === name) {
                    btn.textContent = "Call";
                    btn.disabled = true;
                }
            }
        });
    }
}

export function enableCallbutton() {
    const userListDiv = document.getElementById("user-list");
    if (userListDiv) {
        const callButtons = userListDiv.querySelectorAll("button");
        callButtons.forEach((btn) => {
            const li = btn.closest("li");
            if (li) {
                btn.textContent = "Call";
                btn.disabled = false;

            }
        });
    }
    const btn = document.getElementById("hangup-button");
    if (btn) {
        btn.style.display = "none";
    }
}

export function getUserName(): Name | null {
    const nameInput = document.getElementById("name") as HTMLInputElement | null;
    if (!nameInput) {
        return null;
    }
    const username = nameInput.value.trim();
    if (username.length === 0) {
        return null;
    }
    return username;
}

export function hangUpCall() {
    const ws = WebSocketHandler.getInstance();
    const localVideo = document.getElementById("local_video") as HTMLVideoElement | null;
    const remoteVideo = document.getElementById("received_video") as HTMLVideoElement | null;
    ws.hangUp();

    if (localVideo && localVideo.srcObject instanceof MediaStream) {
        localVideo.pause();
        localVideo.srcObject.getTracks().forEach((track) => {
            track.stop();
        });
        localVideo.srcObject = null;
    }

    if (remoteVideo && remoteVideo.srcObject instanceof MediaStream) {
        remoteVideo.srcObject.getTracks().forEach((track) => {
            track.stop();
        });
        remoteVideo.srcObject = null;
    }
    enableCallbutton();

  
}

export async function attachUserMedia() {
    const pc = RTCPeerConnectionHandler.pc;
    await navigator.mediaDevices
        .getUserMedia({ audio: true, video: true })
        .then((localStream) => {
            const localVideoElem = document.getElementById("local_video") as HTMLVideoElement | null;
            if (localVideoElem) {
                localVideoElem.srcObject = localStream;
            }
            localStream
                .getTracks()
                .forEach((track) => {
                    pc.addTrack(track, localStream);
                });

        });
}
