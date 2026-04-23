// common websocket methods shared among both offerer and offeree peers
// add methods to send these login, logout, new-ice-candidate, hangup
// add methods to handle when these events are received on(new-ice-candidate & hangup)

import { WebSocketMessageSchema, type WebSocketMessage } from "../shared";
import type {  Name } from "../shared/chatmessage";

type WsEvents = {
    "video-offer": (data: { sdp: RTCSessionDescriptionInit }) => void;
    "video-answer": (data: { sdp: RTCSessionDescriptionInit }) => void;
    "new-ice-candidate": (data: { candidate: RTCIceCandidateInit }) => void;
    "hang-up": () => void;
    "call": (data: { name: Name }) => void;
    "accept": (data: { name: Name }) => void;
    "user-list": (data: { names: Name[] }) => void;
};

export class WebSocketHandler {
    private ws: WebSocket;
    public myUserName: Name | undefined;
    private listeners: { [K in keyof WsEvents]?: WsEvents[K] } = {};

    private static instance: WebSocketHandler;


    private constructor() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        this.ws = new WebSocket(`${protocol}//${window.location.host}/`);
        this.ws.onmessage = this.handleWsMessages.bind(this);
        this.ws.onclose = () => {
        WebSocketHandler.instance = undefined as unknown as WebSocketHandler;
        };
    }

    public static getInstance(): WebSocketHandler {
        if (
            this.instance &&
            this.instance.ws.readyState !== WebSocket.CLOSING &&
            this.instance.ws.readyState !== WebSocket.CLOSED
        ) {
            return this.instance;
        }
        this.instance = new WebSocketHandler();
        return this.instance;
    }

    on<K extends keyof WsEvents>(event: K, handler: WsEvents[K]) {
        this.listeners[event] = handler;
    }

    login(name: Name) {
        this.myUserName = name
        this.send({ type: "login", data: { name } });
    }

    logout() {
        this.send({ type: "logout" });
    }

    newIceCandidate(candidate: RTCIceCandidateInit) {
        this.send({ type: "new-ice-candidate", data: { candidate } });
    }

    hangUp() {
        this.send({ type: "hang-up" });
    }

    accept(name: Name) {
        this.send({type:"accept", data: {name}})
    }

    call(name: Name) {
        this.send({type:"call", data: {name}})
    }

    videoOffer(sdp: RTCSessionDescription) {
        this.send({ type: "video-offer", data: { sdp } })
    }

    videoAnswer(sdp: RTCSessionDescription) {
        this.send({ type: "video-answer", data: { sdp } })
    }

    private send(message: WebSocketMessage) {
        this.ws.send(JSON.stringify(message));
    }

    private handleWsMessages(event: MessageEvent) {
        let text: string;
        if (typeof event.data === "string") {
            text = event.data;
        } else if (event.data instanceof ArrayBuffer) {
            text = new TextDecoder().decode(new Uint8Array(event.data));
        } else if (Array.isArray(event.data) && event.data[0] instanceof ArrayBuffer) {
            text = new TextDecoder().decode(new Uint8Array(event.data[0]));
        } else if (event.data && typeof (event.data as any).toString === "function") {
            text = event.data.toString();
        } else {
            throw new Error("Unable to parse WebSocket event data");
        }
        const json = JSON.parse(text);

        const parsedMessage = WebSocketMessageSchema.parse(json);

        switch (parsedMessage.type) {
            case "video-offer":
            case "video-answer":
            case "new-ice-candidate":
            case "call":
            case "user-list":
            case "accept":
                this.emit(parsedMessage.type, parsedMessage.data);
                break;
            case "hang-up":
                this.emit("hang-up");
                break;
        }
    }

    private emit(event: keyof WsEvents, data?: unknown) {
        (this.listeners[event] as ((d?: unknown) => void) | undefined)?.(data);
    }
}