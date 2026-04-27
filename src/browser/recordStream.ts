

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordingStream: MediaStream | null = null;
let isRecording = false;

// Timer state
let timerInterval: ReturnType<typeof setInterval> | null = null;
let startTime = 0;
let elapsedMs = 0;
const recordBtn = document.getElementById("recordBtn") as HTMLDivElement | null;


//  Timer helpers 
function pad(n: number): string {
    return String(Math.floor(n)).padStart(2, "0");
}

function updateTimerDisplay() {
    elapsedMs = performance.now() - startTime;
    const totalSec = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const cs = Math.floor((elapsedMs % 1000) / 10);

    const tooltip = recordBtn?.querySelector(".tooltip");
    if (tooltip) tooltip.textContent = `${pad(mins)}:${pad(secs)}.${pad(cs)}`;
}

function startTimer() {
    startTime = performance.now() - elapsedMs;
    timerInterval = setInterval(updateTimerDisplay, 50);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    elapsedMs = 0;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// Download Popup 
function showDownloadPopup(blob: Blob) {
    const totalSec = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const duration = `${pad(mins)}:${pad(secs)}`;
    const size = formatSize(blob.size);
    const url = URL.createObjectURL(blob);

    // Remove existing popup if any
    const popup = document.getElementById("recordingPopup") as HTMLDivElement;
    const backdrop = document.getElementById("recordingBackdrop") as HTMLDivElement;

    const durationEl = document.getElementById("duration") as HTMLElement;
    const sizeEl = document.getElementById("size") as HTMLElement;

    const downloadBtn = document.getElementById("popupDownload") as HTMLAnchorElement;
    const closeBtn = document.getElementById("popupClose") as HTMLButtonElement;

    // assign values
    durationEl.textContent = duration;
    sizeEl.textContent = size;
    downloadBtn.href = url;

    // show
    popup.style.display = "block";
    backdrop.style.display = "block";

    // close
    closeBtn.onclick = () => {
        popup.style.display = "none";
        backdrop.style.display = "none";
    };

    const close = () => {
        popup.remove();
        backdrop.remove();
        URL.revokeObjectURL(url);
    };

    backdrop.addEventListener("click", close);
    popup.querySelector("#popupClose")?.addEventListener("click", close);

    document.body.appendChild(backdrop);
    document.body.appendChild(popup);
}


export async function recordStream() {

    if (!isRecording) {
        try {
            recordingStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });
        } catch (e) {
            console.error("Screen capture denied:", e);
            return;
        }

        recordedChunks = [];
        mediaRecorder = new MediaRecorder(recordingStream);

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.start(200); // collect chunks every 200ms
        isRecording = true;
        resetTimer();
        startTimer();

        recordBtn?.classList.add("active");

        // auto-stop if user stops screen share
        const videoTracks = recordingStream?.getVideoTracks();
        if (videoTracks && videoTracks.length > 0 && videoTracks[0]) {
            videoTracks[0].onended = stopRecording;
        }
    } else {
        stopRecording();
    }
}

function stopRecording() {
    if (!mediaRecorder || !isRecording) return;

    stopTimer();
    mediaRecorder.stop();

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        showDownloadPopup(blob);
    };

    recordingStream?.getTracks().forEach((track) => track.stop());

    isRecording = false;
    recordBtn?.classList.remove("active");

    const tooltip = recordBtn?.querySelector(".tooltip");
    if (tooltip) tooltip.textContent = "Start Recording";

}