# shared

shared schemas and types for websocket communication

## overview
defines message structure for both chat and signaling

## structure
- chatmessage
- signalingserver
- websocket union schema

## validation
uses zod discriminated union based on "type"

## example
WebSocketMessage =
  | ChatMessage
  | SignalMessage

## purpose
- ensures consistent message format
- runtime validation of incoming data
- shared contract between client and server

## notes
- no runtime dependencies except zod
- used by both server and client