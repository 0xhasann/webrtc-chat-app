import { RTCPeerConnectionHandler } from "./webrtcEventHandler";


export class ChatUI {
    static init() {
        const input = document.getElementById("chat-input") as HTMLInputElement;
        const btn = document.getElementById("send-btn") as HTMLButtonElement;
        btn.disabled = true;

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") btn.click();
        });

        btn.onclick = () => {
            if (!RTCPeerConnectionHandler.dataChannel ||
                RTCPeerConnectionHandler.dataChannel.readyState !== "open") {
                return;
            }
            const message = input.value.trim();
            if (!message) return;

            this.appendMessage(message, "self");
            RTCPeerConnectionHandler.dataChannel?.send(message);

            input.value = "";
        };
    }

    static appendMessage(message: string, type: "self" | "remote") {
        const container = document.getElementById("messages");
        if (!container) return;

        const div = document.createElement("div");
        
        div.innerHTML = message.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank">$1</a>'
        );
        div.className = type;

        

        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${type}`;

        const text = document.createElement("div");
        text.textContent = message;

        const time = document.createElement("div");
        time.className = "time";

        const now = new Date();
        time.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        msgDiv.appendChild(text);
        msgDiv.appendChild(time);

        container.appendChild(msgDiv);

        container.scrollTop = container.scrollHeight;

    }
}