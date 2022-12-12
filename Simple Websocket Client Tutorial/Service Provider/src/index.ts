
interface MessageData {
    name : string;
    service : string;
    comment : string;
    gift : boolean;
}

/*
    Comprehensive name as opposed to 'Message' for purposed related to understanding the mixnet.
*/
interface MixnetMessage {
    message : string;
    replySurb : boolean; // Marked when we want to use a 'Single Use Reply Block', a distinct piece of functionality on the mixnet.
    type : string // 'sent' or 'received'
}

var ourAddress : string;
var websocketConnection : any;
var recievedMessageData : string[] = [];

async function main() {
    var port = '1978' // client websocket listens on 1977 by default, change if yours is different
    var localClientUrl = "ws://127.0.0.1:" + port;

    /*
        Set up and handle websocket connection to our desktop client.
    */

    websocketConnection = await connectWebsocket(localClientUrl).then(function (c) {
        return c;
    }).catch(function (err) {
        display("Websocket connection error. Is the client running with <pre>--connection-type WebSocket</pre> on port " + port + "?");
    })

    websocketConnection.onmessage = function (e) {
        handleResponse(e);
    };

    sendSelfAddressRequest();
}

function decodeStringifiedMessage(message : string){
    let parsedMessage : MessageData;
    
    // We need to decode the message that we have received from our client, where it was JSON.stringify'd before it was sent to our service provider.
    message = message.replace(/\//g,"");

    // After using 'string.replace()' as above, we can turn our data back into an object. This will make it match our attributes defined in the MessageData interface
    parsedMessage = JSON.parse(message);

    // Make a new string value which we can pass into the UI (Received Message Data section).
    return '<b>Name: </b>' + parsedMessage.name + ' , <b>Service: </b>' + parsedMessage.service + ' ,<b> Personal Comment: </b>' + parsedMessage.comment + ' , <b>Wants Free Stuff?: </b>' + translateYesOrNo(parsedMessage.gift)
}

function translateYesOrNo(result : boolean){
    if(result == true) return 'Yes';
    return 'No';
}

/*
    Function that renders the contents of our recievedMessageData array in the Received Message Data section of our UI.
*/
function renderMessageList(){

    var str = '<ul>'

    recievedMessageData.forEach(function(message) {
    str += ' <div class="item"><i class="check circle icon" style="color:orange"></i>'+ message + '</div>';
    }); 

    str += '</ul>';
    document.getElementById("slideContainer").innerHTML = str;
}

/*
     Handle any messages that come back down the websocket. 
*/
function handleResponse(responseMessageEvent : MessageEvent) {
    try {
        let response = JSON.parse(responseMessageEvent.data);
        if (response.type == "error") {
            displayJsonResponseWithoutReply("Server responded with error: " + response.message);
        } else if (response.type == "selfAddress") {
            displayJsonResponseWithoutReply(response);
            ourAddress = response.address;
            display("Our address is:  " + ourAddress);
        } else if (response.type == "received") {
            handleReceivedMessage(response)
        }
    } catch (_) {
        displayJsonResponseWithoutReply(responseMessageEvent.data)
    }
}

function handleReceivedMessage(message : MixnetMessage) {
    const text = message.message
    
    //Make the message that we receive appear in the Activity Log.
    displayJsonResponseWithoutReply(text)

    //Remove slashes , convert message back into json object and add it to our received messages data section.
    recievedMessageData.push(decodeStringifiedMessage(text));

    //Re-render our UI to display our updated received message data.
    renderMessageList();
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
    Set up and handle websocket connection to our desktop client.
*/
function display(message : string) {
    console.log('in display');
    console.log(message);
    document.getElementById("output").innerHTML += "<p>" + message + "</p >";
}

/*
    Function that takes a the incoming message (as sting) as a parameter and displays it as a new entry in the Activity Log.
*/
function displayJsonResponseWithoutReply(message : string) {
    let receivedDiv = document.createElement("div")
    let paragraph = document.createElement("p")

    paragraph.setAttribute('style', 'color: orange')
    let paragraphContent = document.createTextNode("received >>> " + JSON.stringify(message))
    paragraph.appendChild(paragraphContent)

    receivedDiv.appendChild(paragraph)
    document.getElementById("output").appendChild(receivedDiv)
}

/*
    Function that connects our application to the mixnet Websocket. We want to call this first in our main function.
*/
function connectWebsocket(url) {
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
