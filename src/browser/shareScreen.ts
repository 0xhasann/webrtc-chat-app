import { localStream } from "./dom";
import { RTCPeerConnectionHandler } from "./webrtcEventHandler";
import { WebSocketHandler } from "./websocketHandler";

const shareBtn = document.getElementById("shareBtn") as HTMLButtonElement | null;

let shareStream: MediaStream | null = null;
let shareBtnEnabled = false;
const ws = WebSocketHandler.getInstance();
const pc = RTCPeerConnectionHandler.pc;

export async function shareScreen() {
        if (!shareBtnEnabled) {
            console.log("start sharing");

            try {
                shareStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true,
                });
            } catch (e) {
                console.error("Screen share denied:", e);
                return;
            }

            shareBtnEnabled = true;
            shareBtn?.classList.add("active");

            const tooltip = shareBtn?.querySelector(".tooltip");
            if (tooltip) tooltip.textContent = "Stop Sharing";

            // Swap the camera track with the screen track in the peer connection
            const screenTrack = shareStream.getVideoTracks()[0];
            if (screenTrack) {
                const sender = pc.getSenders().find((s) => s.track?.kind === "video");
                if (sender) {
                    await sender.replaceTrack(screenTrack);
                    // Force renegotiation to revert remote peer back to camera
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    if (pc.localDescription) {
                        ws.videoOffer(pc.localDescription);
                    }
                }
                const localVideo = document.getElementById("local_video") as HTMLVideoElement | null;
                if (localVideo) localVideo.srcObject = shareStream;
            }

            // Auto-stop when the user clicks "Stop sharing" in the browser bar
            const videoTracks = shareStream?.getVideoTracks();
            if (videoTracks && videoTracks[0]) {
                videoTracks[0].onended = stopSharing;
            }

        } else {
            console.log(" stop sharing")
            stopSharing();
        }
}

async function stopSharing() {
    if (!shareBtnEnabled) return;

    shareStream?.getTracks().forEach((track) => track.stop());
    shareStream = null;

    // Revert back to the camera track
    const cameraTrack = (localStream as unknown as MediaStream | null)?.getVideoTracks()[0];
    if (cameraTrack) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
            await sender.replaceTrack(cameraTrack);
            // Force renegotiation to revert remote peer back to camera
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (pc.localDescription) {
                ws.videoOffer(pc.localDescription);
            }
        }
        const localVideo = document.getElementById("local_video") as HTMLVideoElement | null;
        if (localVideo && localStream) {
            localVideo.srcObject = localStream as unknown as MediaStream;
        }
    }

    shareBtnEnabled = false;
    shareBtn?.classList.remove("active");

    const tooltip = shareBtn?.querySelector(".tooltip");
    if (tooltip) tooltip.textContent = "Start Sharing";
}