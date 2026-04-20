# server
bun based signaling server for webrtc chat

## install
bun install

## run
bun run start

## overview
- http server handles basic requests
- websocket server handles realtime signaling
- uses zod for message validation

## flow
- client connects via websocket
- user logs in with a unique name
- users can call other users
- server links peers for p2p communication
- signaling messages are forwarded between peers

## message types
- login
- call
- accept
- video-offer
- video-answer
- new-ice-candidate
- hang-up

## notes
- server only relays signaling data
- peer connection handled by webrtc on client side
- connections stored in memory using maps