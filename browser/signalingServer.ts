// Class
// 1) connect to ws server
// 2) expose an api to send 
//      a) offer b) answer c) signal d) icecandidate e) join
// 3) expose an api which should implement the following like webrtc api
//      a) onoffer b) onanswer c) onsignal d) onicecandidate
/*
    For Example: ss=> new SignalingServer()
    ss.onoffer = (offer) => {
        ...
    }
    or 
    function  handleOnOffer(){
        ...
    }
    ss.onoffer = handleOnOffer
*/