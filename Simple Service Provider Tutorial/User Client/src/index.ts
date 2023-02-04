/*
    The address that is given to us from our mixnet client.
*/
var ourAddress : string;

/*
    Address we want to send our messages to.
*/
var targetAddress: string = 'EGDHEwXhYHEiu15emXAvsvqWBtAVXazPAYYJNEbmfHsV.GmjtZwTA4jFeUniMzj3mQR5BMiEGwB1qYtbg3v9jgMho@3sMAn8JPJc9p8nENaBJGPhUEebiA7kNxP4nGhMgGaZqG';

/*
    Variable that holds our websocket connection data.
*/
var websocketConnection: any;

/*
    Variable that holds our selectedPayload data.
*/
var selectedPayload: any;

const fileInput = document.querySelector('#fileInput')
const sendFileButton = document.querySelector('#sendFile') as HTMLButtonElement

async function main() {
    var port = '1977' // client websocket listens on 1977 by default.
    var localClientUrl = "ws://127.0.0.1:" + port;
    
    // Set up and handle websocket connection to our desktop client.
    websocketConnection = await connectWebsocket(localClientUrl).then(function (c) {
        return c;
    }).catch(function (err) {
        displayClientMessage("Websocket connection error. Is the client running with <pre>--connection-type WebSocket</pre> on port " + port + "?");
    })

    websocketConnection.onmessage = function (e) {
        handleResponse(e);
    };
    
    sendSelfAddressRequest();
    
    fileInput.addEventListener('change', onFileChange, false);
}

/*
    Get out address to log in the activity log so we know what our address is in the mixnet via our application UI
*/
function sendSelfAddressRequest() {
    var selfAddress = {
        type: "selfAddress"
    }
    displayJsonSend(selfAddress);
    websocketConnection.send(JSON.stringify(selfAddress));
}

/*
    Function that fires of then the selected file on our input changes. Enables for files to be uploaded instantly.
*/
function onFileChange(){
    selectedPayload = document.getElementById('fileInput').files[0];
    var reader = new FileReader();
    reader.readAsDataURL(document.getElementById('fileInput').files[0]);
    reader.addEventListener('load', readAndSendFile);
}

function readAndSendFile(event) {
    let blobResult = event.target.result
    sendMessageToMixnet(blobResult);
}

/*
    Function that gets the form data and sends that to the mixnet in a stringified JSON format.
*/
function sendMessageToMixnet(payload) {
    
    var messageContentToSend  = {
         lastModified: selectedPayload.lastModified,
         lastModifiedDate: selectedPayload.lastModifiedDate,
         name: selectedPayload.name,
         size: selectedPayload.size,
         type: selectedPayload.type,
         dataUrl: payload
    };  
    
    /*We have to send a string to the mixnet for it to be a valid message , so we use JSON.stringify to make our object into a string.*/
    const message = {
        type: "send",
        message: JSON.stringify(messageContentToSend),
        recipient: targetAddress,
        withReplySurb: false,
    }
    
    //Display our json data to ber sent
    displayJsonSend(message);
    
    //Send our message object via out via our websocket connection.
    websocketConnection.send(JSON.stringify(message));
}

/* Connect to a websocket. */
function connectWebsocket(url) {
    return new Promise(function (resolve, reject) {
        var server = new WebSocket(url);
        console.log('connecting to Websocket Server (Nym Client)...')
        server.onopen = function () {
            resolve(server);
        };
        server.onerror = function (err) {
            reject(err);
        };
    });
}

/*
    Handle any messages that come back down the websocket.
*/
function handleResponse(resp) {
    try {
        let response = JSON.parse(resp.data);
        if (response.type == "error") {
            displayJsonReceived("Server responded with error: " + response.message);
        } else if (response.type == "selfAddress") {
            displayJsonReceived(response);
            ourAddress = response.address;
            console.log(ourAddress)
            displayClientMessage("Our address is:  " + ourAddress + ", we will now send messages to ourself.");
        } else if (response.type == "received") {
            handleReceivedMessage(response)
        }
    } catch (_) {
        displayJsonReceived(resp.data)
    }
}

/*
    Display messages that relates to initializing our client and client status (appearing in our activity log).
*/
function displayClientMessage(message) {
    document.getElementById("output").innerHTML += "<p>" + message + "</p >";
}

/*
    Handle any string message values that are received through messages sent back to us.
*/
function handleReceivedMessage(message) {
    const stringifiedMessage = message.message
    displayJsonReceived(stringifiedMessage)
}

/*
    Functions that will display 'send' related event logs into our activity log.
*/
function displayJsonSend(message) {
    let sendDiv = document.createElement("div")
    let messageLog = document.createElement("p")

    messageLog.setAttribute('style', 'color: #36d481');

    let lineContent;

    if (message.type == 'selfAddress'){
        lineContent = document.createTextNode("Sent ourselves our address.")
    } else {
        let decodedMessage = message.message.replace(/\//g,"");

        // After using 'string.replace()' as above, we can turn our data back into an object. This will make it match our attributes defined in the MessageData interface
        let parsedMessage = JSON.parse(decodedMessage);

        lineContent = document.createTextNode("⬆ Sent File : " + parsedMessage.name)
    }

    messageLog.appendChild(lineContent)
    sendDiv.appendChild(messageLog)
    document.getElementById("output").appendChild(sendDiv)
}

/*
    Functions that will display 'send' related event logs into our activity log.
*/
function displayJsonReceived(message) {
    const timeElapsed = Date.now();
    const today = new Date(timeElapsed);
    let parsedMessage = JSON.parse(message);
    
    let dataLog = {
        url : parsedMessage.url,
        name: parsedMessage.name,
        dataUrl : parsedMessage.dataUrl,
        time : today.toUTCString()
    }
    
    let receivedDiv = document.createElement("div");
    let messageLogLine1 = document.createElement("p");
    let messageLogLine2 = document.createElement("p");

    messageLogLine1.setAttribute('style', 'color: orange;word-break: break-word;');
    messageLogLine2.setAttribute('style', 'color: orange;word-break: break-word;');

    let line1Contents;
    let line2Contents;

    if (parsedMessage.type == 'selfAddress'){
        line1Contents = document.createTextNode("Initialized Mixnet Websocket.");
        line2Contents = document.createTextNode('Our address : ' + parsedMessage.address);
    } else {
        line1Contents = document.createTextNode("⬇ " + dataLog.time + " | " + dataLog.name);
        line2Contents = document.createTextNode('Link: ' + dataLog.url);
    }

    messageLogLine1.appendChild(line1Contents);
    messageLogLine2.appendChild(line2Contents);
    
    receivedDiv.appendChild(messageLogLine1);
    receivedDiv.appendChild(messageLogLine2);
    document.getElementById("output").appendChild(receivedDiv);
}


main();