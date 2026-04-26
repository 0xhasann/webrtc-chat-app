// the browser orchestration layer
// ties everything together. listens for ws events and drives the webrtc flow

/* caller (you called someone)
ws.on("accept") fires → call is accepted
Attaches local media (attachUserMedia) → adding tracks triggers onnegotiationneeded
onnegotiationneeded → creates offer → sends video-offer
ws.on("video-answer") → pc.setRemoteDescription()
ws.on("new-ice-candidate") → pc.addIceCandidate()
*/

/* callee flow (someone called you):

ws.on("video-offer") fires → you are the answerer
pc.setRemoteDescription(offer)
Attaches local media
pc.createAnswer() → pc.setLocalDescription(answer) → sends video-answer
ws.on("new-ice-candidate") → pc.addIceCandidate()
*/

import { ChatUI } from "./chat";
import { disableCallButton, attachUserMedia, hangUpCall, renderIncomingCall, renderUserList, login, setRemoteNameLabel } from "./dom";
import { attachDataChannelHandlers, RTCPeerConnectionHandler } from "./webrtcEventHandler";
import { WebSocketHandler } from "./websocketHandler";

const ws = WebSocketHandler.getInstance();
document.getElementById("loginBtn")?.addEventListener("click", login);
document.getElementById("hangup-button")?.addEventListener("click", hangUpCall);


ChatUI.init();
const pc = RTCPeerConnectionHandler.pc;

ws.on("new-ice-candidate", async (event) => {
    await pc.addIceCandidate(event.candidate);
});
ws.on("video-answer", async (event) => {
    if (pc.signalingState !== "have-local-offer") return;
    await pc.setRemoteDescription(event.sdp);
})

ws.on("accept",async ({ name }) => {
    disableCallButton(name);
    const dc = pc.createDataChannel("chat");
    RTCPeerConnectionHandler.dataChannel = dc;
    attachDataChannelHandlers(dc);

    ws.on("hang-up", () => {
        hangUpCall();
       
    })

    await attachUserMedia();
    setRemoteNameLabel(name);
});


ws.on("video-offer", async (event) => {
    ws.on("hang-up", () => {
        hangUpCall();
       
    });

    await pc.setRemoteDescription(event.sdp);

    // Get media and use addTrack (not addTransceiver)
    await attachUserMedia();


    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (!pc.localDescription) return;
    ws.videoAnswer(pc.localDescription);
});


ws.on("call", renderIncomingCall);
ws.on("user-list",  renderUserList);
