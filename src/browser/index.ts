import { disableCallButton, attachUserMedia, hangUpCall, renderIncomingCall, renderUserList, login, setRemoteNameLabel } from "./dom";
import { RTCPeerConnectionHandler } from "./webrtcEventHandler";
import { WebSocketHandler } from "./websocketHandler";

const ws = WebSocketHandler.getInstance();
document.getElementById("loginBtn")?.addEventListener("click", login);
document.getElementById("hangup-button")?.addEventListener("click", hangUpCall);


ws.on("accept",async ({ name }) => {
    disableCallButton(name);
    const pc = RTCPeerConnectionHandler.pc;


    ws.on("new-ice-candidate", async (event) => {
        await pc.addIceCandidate(event.candidate);
    });
    ws.on("video-answer", async (event) => {
        await pc.setRemoteDescription(event.sdp);
    })
    ws.on("hang-up", () => {
        hangUpCall();
       
    })

    await attachUserMedia();
    setRemoteNameLabel(name);
});


ws.on("video-offer", async (event) => {
    const pc = RTCPeerConnectionHandler.pc;


    ws.on("new-ice-candidate", async (event) => {
        await pc.addIceCandidate(event.candidate);
    });
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