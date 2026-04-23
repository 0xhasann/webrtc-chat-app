// methods that webrtc expects us to implement for peer to peer connection
// onicecandidate -> send ice candidate to peer
// ontrack -> display the stream on dom (displayRemoteStream) from dom.ts
// onnegotiationneeded -> call createOffer -> set local description -> send video-offer to peer
// onremovetrack -> close video call
// oniceconnectionstatechange -> update the dom to reflect ice connection states
// onicegatheringstatechange -> update the dom to reflect ine gathering states
// onsignalingstatechange -> update the dom to reflect rtc signaling states

import { WebSocketHandler } from "./websocketHandler";

export class RTCPeerConnectionHandler {
    private static rtcPeerConnectionHandler: RTCPeerConnectionHandler | null;
    private rtcPeerConnection: RTCPeerConnection;

    private constructor() {
        this.rtcPeerConnection = createPeerConnection();
    }

    public static close():void {
        this.pc.getTransceivers().forEach(t => t.stop());
        this.pc.ontrack = null;
        this.pc.onicecandidate = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.onsignalingstatechange = null;
        this.pc.onicegatheringstatechange = null;
        this.pc.onnegotiationneeded = null;
        this.pc.close();
        this.rtcPeerConnectionHandler = null;
 
    }

    public static get pc(): RTCPeerConnection {
        if (this.rtcPeerConnectionHandler) return this.rtcPeerConnectionHandler.rtcPeerConnection;
        this.rtcPeerConnectionHandler = new RTCPeerConnectionHandler();
        return this.rtcPeerConnectionHandler.rtcPeerConnection;
    }

}

function createPeerConnection(): RTCPeerConnection {
    const ws = WebSocketHandler.getInstance();
    const pc = new RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org",
            },
        ],
    });
    pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        ws.newIceCandidate(e.candidate);
    }
    pc.onnegotiationneeded = () => {
        if (pc.signalingState != "stable") return;
        pc
            .createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
                if (!pc.localDescription) throw new Error("local description not found");
                ws.videoOffer(pc.localDescription);
            })
            .catch(window.reportError);
    }
    pc.onconnectionstatechange = () => {
        const btn = document.getElementById("hangup-button");
        if (!btn) return;
        if (pc.connectionState === "connected") {
            btn.style.display = "block";
        }
    };
    pc.ontrack = (event) => {
        const receivedVideo = document.getElementById("received_video") as HTMLVideoElement | null;
        if (receivedVideo && event.streams && event.streams[0]) {
            receivedVideo.srcObject = event.streams[0];
        }
        const hangupBtn = document.getElementById("hangup-button") as HTMLButtonElement | null;
        if (hangupBtn) {
            hangupBtn.disabled = false;
        }
    };
    return pc;
}