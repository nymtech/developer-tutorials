import WebSocket, { MessageEvent } from "ws";

/*
    Comprehensive name as opposed to 'Message' for purposed related to understanding the mixnet.
*/
var ourAddress : string;
var websocketConnection : any;

async function main() {
    var port = '1978' // client websocket listens on 1977 by default, change if yours is different
    var localClientUrl = "ws://127.0.0.1:" + port;

    /*
        Set up and handle websocket connection to our desktop client.
    */
    websocketConnection = await connectWebsocket(localClientUrl).then(function (c) {
        return c;
    }).catch(function (err) {
        console.log("Websocket connection error. Is the client running with <pre>--connection-type WebSocket</pre> on port " + port + "?");
        console.log(err);
    })

    websocketConnection.onmessage = function (e : any) {
        handleResponse(e);
    };

    sendSelfAddressRequest();
}

/*
     Handle any messages that come back down the websocket. 
*/
function handleResponse(responseMessageEvent : MessageEvent) {

    /*
        The '\x1b' orefix you see in our console.log enables the ability for us to color our 'console.log' statements. The number that 
        you see following the '[' and preceeding 'm' is the color code that can be compared here :
        https://en.m.wikipedia.org/wiki/ANSI_escape_code#Colors
    */

    try {
            let response = JSON.parse(responseMessageEvent.data.toString());
        if (response.type == "error") {
            console.log("\x1b[91mAn error occured: " + response.message + "\x1b[0m")
        } else if (response.type == "selfAddress") {
            ourAddress = response.address;
            console.log("\x1b[94mOur address is: " + ourAddress + "\x1b[0m")
        } else if (response.type == "received") {
            let messageContent = JSON.parse(response.message)

            console.log('\x1b[93mRecieved : \x1b[0m');
            console.log('\x1b[92mName : ' + messageContent.name + '\x1b[0m');
            console.log('\x1b[92mService : ' + messageContent.service + '\x1b[0m');
            console.log('\x1b[92mComment : ' + messageContent.comment + '\x1b[0m');

            console.log('\x1b[93mSending response back to client... \x1b[0m')
            sendMessageToMixnet(messageContent.fromAddress)

        }
    } catch (_) {
        console.log('something went wrong in handleResponse')
    }
}

/*
    Function that gets the form data and sends that to the mixnet in a stringified JSON format.
*/
function sendMessageToMixnet(targetAddress : any) {

    /*
        Place each of the form values into a single object to be sent.
    */
    const messageContentToSend = {
        text : 'We recieved your request!',
        fromAddress : ourAddress
    }
    
    /*
        We have to send a string to the mixnet for it to be a valid message , so we use JSON.stringify to make our object into a string.
    */
    const message = {
        type: "send",
        message: JSON.stringify(messageContentToSend),
        recipient: targetAddress,
        withReplySurb: false,
    }
    
    /*
        Send our message object via out via our websocket connection.
    */
    websocketConnection.send(JSON.stringify(message));
}

/*
    Send a message to the mixnet client, asking what our own address is. 
*/
function sendSelfAddressRequest() {
    var selfAddress = {
        type: "selfAddress"
    }
    websocketConnection.send(JSON.stringify(selfAddress));
}

/*
    Function that connects our application to the mixnet Websocket. We want to call this first in our main function.
*/
function connectWebsocket(url : string) {
    return new Promise(function (resolve, reject) {
        var server = new WebSocket(url);
        console.log('connecting to Mixnet Websocket (Nym Client)...')
        server.onopen = function () {
            resolve(server);
        };
        server.onerror = function (err) {
            reject(err);
        };

    });
}


main();

