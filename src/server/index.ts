import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { handleWebRequest, log, PORT } from "./utils";
import { WebSocketMessageSchema, type WebSocketMessage } from "../shared";
import type { Name } from "../shared/chatmessage";
import * as z from "zod";
//create a http server
// const webServer = createServer(handleWebRequest);
const webServer = createServer((req, res) => {
    handleWebRequest(req, res);
});
//listen http req and sends http res via PORT
webServer.listen(PORT, () => {
    log(`Server is listening on http://localhost:${PORT}`);
});

interface ExtendedWebSocket extends WebSocket {
    userName?: string;
}

const wsServer = new WebSocketServer({
    server: webServer
});
// When a client connects to our websocket server
// on connection event is triggered
// on connection returns the websocket instance with it to do operations
const websocketConnections: Map<Name, ExtendedWebSocket> = new Map()
const peerToPeer: Map<Name, Name> = new Map();

function hangupCall(webServer: ExtendedWebSocket) {
    const firstPeer = webServer.userName;
    if (!firstPeer) {
        return;
    }
    const secondPeer = peerToPeer.get(firstPeer);
    if (!secondPeer) {
        return;
    }
    peerToPeer.delete(firstPeer);
    peerToPeer.delete(secondPeer);

    const secondPeerSocket = websocketConnections.get(secondPeer);
    secondPeerSocket?.send(JSON.stringify({ type: "hang-up" }));

    console.log("Connection Closed");
}

wsServer.on('connection', (websocket: ExtendedWebSocket) => {
    websocket.on("close", (code: number, reason: Buffer) => {
        hangupCall(websocket);
        if (!websocket.userName) return;
        websocketConnections.delete(websocket.userName);
    })

    websocket.on("message", (data: Buffer) => {
        try {
            const json = JSON.parse(data.toString());
            const parsedMessage = z.parse(WebSocketMessageSchema, json);

            switch (parsedMessage.type) {
                case "hang-up":
                    hangupCall(websocket);
                    break;
                case "new-ice-candidate":
                case "video-answer":
                case "video-offer":
                    if (!websocket.userName) {
                        websocket.send("Login First");
                    } else {

                        const peer = peerToPeer.get(websocket.userName);
                        if (!peer) {
                            websocket.send("Peer Not Found Please Call Them First.");
                        } else {
                            const peerWebsocket = websocketConnections.get(peer);
                            if (!peerWebsocket) {
                                websocket.send("Peer Not Found or Disconnected");
                            } else {
                                peerWebsocket.send(JSON.stringify(parsedMessage));
                            }
                        }

                    }

                    break;
                case "login":
                    websocketConnections.set(parsedMessage.data.name, websocket);
                    websocket.userName = parsedMessage.data.name;
                    websocketConnections.forEach((list) => list.send(JSON.stringify({ type: "user-list", data: { names: websocketConnections.keys().toArray() } })))
                    break
                // If call is coming from user to server then name is callee
                // If call is coming from server to user then name is caller
                case "call":
                    if (!websocket.userName) {
                        websocket.send("Login First");
                    } else {
                        if (!websocketConnections.has(parsedMessage.data.name)) {
                            websocket.send("Callee does not exist");
                        } else {
                            const callee = websocketConnections.get(parsedMessage.data.name)!;
                            callee.send(JSON.stringify({ type: "call", data: { name: websocket.userName } }));
                        }
                    }
                    break
                case "accept":
                    if (!websocket.userName) {
                        websocket.send("Login First");
                    } else {
                        peerToPeer.set(parsedMessage.data.name, websocket.userName);
                        peerToPeer.set(websocket.userName, parsedMessage.data.name);
                        const callerSocket = websocketConnections.get(parsedMessage.data.name);
                        callerSocket?.send(JSON.stringify({ type: "accept", data: { name: websocket.userName } }));
                    }
            }


        } catch (err) {
            if (err instanceof z.ZodError) {
                console.log(err)
                websocket.send(JSON.stringify({
                    type: "validation-error",
                    errors: z.treeifyError(err),
                }));
            } else {
                websocket.send(JSON.stringify({
                    type: "invalid-json",
                }));
            }

        }

    })
})

wsServer.on('close', () => {
    console.log("Websocket Server Closed");
})

wsServer.on("error", (err) => {
    console.error("WS Server Error:", err);
});

wsServer.on("connection", (ws, req) => {
    console.log("WS CONNECTED:", req.url);
});

webServer.on("upgrade", (req, socket, head) => {
    console.log("UPGRADE REQUEST:", req.url);
});
