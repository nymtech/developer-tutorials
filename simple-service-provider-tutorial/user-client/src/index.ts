// The address that is given to us from our mixnet client.
var ourAddress: string;

// Address we want to send our messages to. Replace it with the address of your Service Provider's Nym client!
var targetAddress: string = '6V5eEguz4rUsfntVLKQuD2ymgdY5iDKCV2GY2EH3CxG4.AKdk22atwRaVkN2PLEDsWUKKDc3ieNm1avKqVGgmJx8s@FQon7UwF5knbUr2jf6jHhmNLbJnMreck1eUcVH59kxYE';

// Variable that holds our websocket connection data.
var websocketConnection: any;

async function main() {
    var port = '1977' // Nym Websocket Client listens on 1977 by default.
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
    
    // Set up the send button
    const sendButton = document.querySelector('#send-button');
    
    sendButton?.addEventListener('click', function handleClick(event) {
        sendMessageToMixnet(); 
    });
}

// Get our own client address to log in the activity log so we know what our address is in the mixnet via our application UI
function sendSelfAddressRequest() {
    var selfAddress = {
        type: "selfAddress"
    }
    displayJsonSend(selfAddress);
    websocketConnection.send(JSON.stringify(selfAddress));
}

// Function that gets the form data and sends that to the mixnet in a stringified JSON format.
function sendMessageToMixnet() {

    // Access our form's elements current values
    var nameInput = (<HTMLInputElement>document.getElementById("nameInput")).value;
    var textInput = (<HTMLInputElement>document.getElementById("textInput")).value;
   
    // construct the content of our message to send through the mixnet 
    const messageContentToSend = {
        name : nameInput,
        comment : textInput,
    }
    
    // construct our message object to send to the SP via the mixnet   
    const message = {
        type: "sendAnonymous",
        message: JSON.stringify(messageContentToSend),
        recipient: targetAddress,
        replySurbs: 5
    }
    
    // Display the json data you're sending to the SP on the UI
    displayJsonSend(message);
    
    // Send our message object via out via our websocket connection.
    websocketConnection.send(JSON.stringify(message));
}

// Display responses into our activity log.
function displayJsonSend(message) {
    let sendDiv = document.createElement("div")
    let paragraph = document.createElement("p")
    paragraph.setAttribute('style', 'color: #36d481')
    let paragraphContent = document.createTextNode("sent >>> " + JSON.stringify(message))
    paragraph.appendChild(paragraphContent)
    
    sendDiv.appendChild(paragraph)
    document.getElementById("output").appendChild(sendDiv)
}

// Connect to a websocket. 
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

// Display messages that relate to initialising our client + client status in our activity log.
function displayClientMessage(message) {
    document.getElementById("output").innerHTML += "<p>" + message + "</p >";
}

// Handle any messages that come back down the websocket.
function handleResponse(resp) {
    try {
        let response = JSON.parse(resp.data);
        if (response.type == "error") {
            displayJsonResponse("Server responded with error: " + response.message);
        } else if (response.type == "selfAddress") {
            ourAddress = response.address;
            displayClientMessage("Our address is:  " + ourAddress);
        } else if (response.type == "received") {
            handleReceivedTextMessage(response)
        }
    } catch (_) {
        displayJsonResponse(resp.data)
    }
}

// Handle any string message values that are received through messages sent back to us.
function handleReceivedTextMessage(message) {
    const text = JSON.parse(message.message)
    displayJsonResponse(text)
}

// Display websocket responses in the Activity Log.
function displayJsonResponse(message) {
    let receivedDiv = document.createElement("div")
    let paragraph = document.createElement("p")
    paragraph.setAttribute('style', 'color: orange')
    let textNode = document.createTextNode("received >>> " + message.text)
    paragraph.appendChild(textNode)
    
    receivedDiv.appendChild(paragraph)
    document.getElementById("output").appendChild(receivedDiv)
}

main();
