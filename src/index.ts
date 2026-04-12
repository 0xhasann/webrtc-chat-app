import { WebSocketServer, WebSocket } from "ws";


type RTCSdpType = "offer" | "answer" | "pranswer" | "rollback";

type SessionDescriptionInit = {
    type: RTCSdpType;
    sdp?: string;
};

type IceCandidateInit = {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
};


type JoinMessage = {
    type: "join";
    roomId: string;
};

type OfferMessage = {
    type: "offer";
    roomId: string;
    sdp: SessionDescriptionInit;
};

type AnswerMessage = {
    type: "answer";
    roomId: string;
    sdp: SessionDescriptionInit;
};

type IceCandidateMessage = {
    type: "ice-candidate";
    roomId: string;
    candidate: IceCandidateInit;
};

type SignalMessage = {
    type: "signal";
    roomId: string;
    payload: unknown;
};

type IncomingMessage =
    | JoinMessage
    | OfferMessage
    | AnswerMessage
    | IceCandidateMessage
    | SignalMessage;


type JoinedResponse = {
    type: "joined_123";
};

type RelayedMessage = OfferMessage | AnswerMessage | IceCandidateMessage | SignalMessage;

type OutgoingMessage = JoinedResponse | RelayedMessage;


const SIGNAL_TYPES = new Set<IncomingMessage["type"]>([
    "offer",
    "answer",
    "ice-candidate",
    "signal",
]);

function isSignalType(
    msg: IncomingMessage
): msg is OfferMessage | AnswerMessage | IceCandidateMessage | SignalMessage {
    return SIGNAL_TYPES.has(msg.type);
}

function parseIncomingMessage(raw: string): IncomingMessage | null {
    try {
        const parsed: unknown = JSON.parse(raw);

        if (
            typeof parsed !== "object" ||
            parsed === null ||
            !("type" in parsed) ||
            typeof (parsed as Record<string, unknown>).type !== "string"
        ) {
            console.error("Invalid message shape:", parsed);
            return null;
        }

        const msg = parsed as Record<string, unknown>;
        const type = msg.type as string;

        const validTypes: IncomingMessage["type"][] = [
            "join",
            "offer",
            "answer",
            "ice-candidate",
            "signal",
        ];

        if (!validTypes.includes(type as IncomingMessage["type"])) {
            console.error("Unknown message type:", type);
            return null;
        }

        if (typeof msg.roomId !== "string") {
            console.error("Missing or invalid roomId in message:", msg);
            return null;
        }

        return parsed as IncomingMessage;
    } catch (err) {
        console.error("Failed to parse message JSON:", err);
        return null;
    }
}

function sendMessage(socket: WebSocket, message: OutgoingMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}


class RoomRegistry {
    private readonly rooms = new Map<string, Set<WebSocket>>();

    join(roomId: string, ws: WebSocket): void {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId)!.add(ws);
    }

    broadcast(roomId: string, sender: WebSocket, message: RelayedMessage): void {
        const clients = this.rooms.get(roomId);
        if (!clients) return;

        clients.forEach((client) => {
            if (client !== sender) {
                sendMessage(client, message);
            }
        });
    }

    removeClient(ws: WebSocket): void {
        this.rooms.forEach((clients) => clients.delete(ws));
    }
}


const PORT = parseInt(process.env.PORT ?? "3001", 10);
const wss = new WebSocketServer({ port: PORT });
const registry = new RoomRegistry();

wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (data: Buffer | ArrayBuffer | Buffer[]) => {
        const raw = Buffer.isBuffer(data)
            ? data.toString("utf8")
            : Array.isArray(data)
                ? Buffer.concat(data).toString("utf8")
                : Buffer.from(data).toString("utf8");
        console.log("Raw data:", raw);

        const message = parseIncomingMessage(raw);
        if (!message) return;

        console.log("Parsed message:", message);

        if (message.type === "join") {
            registry.join(message.roomId, ws);
            sendMessage(ws, { type: "joined_123" });
            console.log("Client joined room:", message.roomId);
            return;
        }

        if (isSignalType(message)) {
            console.log("Signal received, relaying to peers in room:", message.roomId);
            registry.broadcast(message.roomId, ws, message);
        }
    });

    ws.on("close", () => {
        registry.removeClient(ws);
        console.log("WebSocket closed, client removed from all rooms.");
    });
});

console.log(`Server running on ws://localhost:${PORT}`);