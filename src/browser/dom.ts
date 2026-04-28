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

// UI logic hanlder
import type { Name } from "../shared/chatmessage";
import { RTCPeerConnectionHandler } from "./webrtcEventHandler";
import { WebSocketHandler } from "./websocketHandler";

export let localStream: MediaStream | null = null;

export function disableRemoteNameLabel() {
    const remoteLabel = document.getElementById("remote-name-label") as HTMLSpanElement;
    remoteLabel.textContent = "";
    remoteLabel.style.display = "none";
    const btn = document.getElementById("HangupBtn");
    if (btn) {
        btn.style.display = "none";
    }

}

export function setRemoteNameLabel(remoteName: string) {
    const remoteLabel = document.getElementById("remote-name-label") as HTMLSpanElement;
    const btn = document.getElementById("HangupBtn") as HTMLSpanElement;
    const header = document.getElementById("chat-header") as HTMLSpanElement;
    const chatUser = document.getElementById("chat-user") as HTMLSpanElement;
    if (chatUser) {
        chatUser.textContent = remoteName;
    }
    
    if (btn) {
        btn.style.display = "block";
    }
    if (header) header.textContent = `Chat with ${remoteName}`;
    remoteLabel.textContent = remoteName;


}

// hides the form, shows welcome text, calls ws.login()
export function login() {
    const ws = WebSocketHandler.getInstance();
    const nameInput = document.getElementById("name") as HTMLInputElement;
    const loginForm = document.getElementById("login-form") as HTMLParagraphElement;
    const welcomeText = document.getElementById("welcome-text") as HTMLParagraphElement;
    const name = nameInput.value.trim();
    if (!name) return;

    loginForm.style.display = "none";

    welcomeText.textContent = `Welcome To Waves, ${name}!`;
    welcomeText.style.display = "block";
    const localLabel = document.getElementById("local-name-label") as HTMLSpanElement;
    localLabel.textContent = name;
    if (!name) {
        alert("Name not set");
        return;
    }
    ws.login(name);
}

//builds the user list with a "Call" button per user
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

// inserts an "Accept" prompt when a call comes in
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
        setRemoteNameLabel(data.name);

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
    const btn = document.getElementById("HangupBtn");
    if (btn) {
        btn.style.display = "none";
    }
}

//  stops media tracks, closes RTCPeerConnection, calls ws.hangUp()
export function hangUpCall() {
    const ws = WebSocketHandler.getInstance();
    const localVideo = document.getElementById("local_video") as HTMLVideoElement | null;
    const remoteVideo = document.getElementById("received_video") as HTMLVideoElement | null;
    ws.hangUp();

    RTCPeerConnectionHandler.close();
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
    disableRemoteNameLabel();
}

// gets camera/mic, adds tracks to the peer connection
export async function attachUserMedia(audio: boolean, video: boolean): Promise<boolean> {
    const pc = RTCPeerConnectionHandler.pc;
    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn)
        shareBtn.style.display = "block";

    const recordBtn = document.getElementById("recordBtn");
    if (recordBtn)
        recordBtn.style.display = "block";

    try {
        // Always acquire both tracks on first stage
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });

        // Use the booleans to set initial enabled state
        localStream.getAudioTracks().forEach(track => (track.enabled = audio));
        localStream.getVideoTracks().forEach(track => (track.enabled = video));


        const localVideoElem = document.getElementById("local_video") as HTMLVideoElement | null;
        if (localVideoElem) {
            localVideoElem.srcObject = localStream;
        }

        if (!localStream) return false;
        localStream.getTracks().forEach((track) => {
            if (localStream) {
                pc.addTrack(track, localStream);
            }
        });

        return true;

    } catch (err: any) {
        if (err.name === "NotAllowedError") {
            console.warn("User denied camera/mic permission");
        } else if (err.name === "NotFoundError") {
            console.warn("No camera/mic device found");
        } else {
            console.error("getUserMedia error:", err);
        }
        return false;
    }
}
