/*
    The address that is given to us from our mixnet client.
*/
var ourAddress : string;

/*
    Address we want to send our messages to.
*/
var targetAddress: string = '';

/*
    Variable that holds our websocket connection data.
*/
var websocketConnection: any;

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
    
    // Set up the send button
    const sendButton = document.querySelector('#send-button');
    
    sendButton?.addEventListener('click', function handleClick(event) {
        sendMessageToMixnet(); 
    });
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
    Function that gets the form data and sends that to the mixnet in a stringified JSON format.
*/
function sendMessageToMixnet() {

    //Access our form elements current values
    var nameInput = (<HTMLInputElement>document.getElementById("nameInput")).value;
    var serviceSelect = (<HTMLInputElement>document.getElementById("serviceSelect")).value;
    var textInput = (<HTMLInputElement>document.getElementById("textInput")).value;
    var freebieCheck = (<HTMLInputElement>document.getElementById("freebieCheck")).checked;
    
    //Place each of the form values into a single object to be sent.
    const messageContentToSend = {
        name : nameInput,
        service : serviceSelect,
        comment : textInput,
        gift : freebieCheck
    }
    
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

/*
    Functions that will display responses into our activity log.
*/
function displayJsonSend(message) {
    let sendDiv = document.createElement("div")
    let paragraph = document.createElement("p")
    paragraph.setAttribute('style', 'color: #36d481')
    let paragraphContent = document.createTextNode("sent >>> " + JSON.stringify(message))
    paragraph.appendChild(paragraphContent)
    
    sendDiv.appendChild(paragraph)
    document.getElementById("output").appendChild(sendDiv)
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
    Display messages that relates to initializing our client and client status (appearing in our activity log).
*/
function displayClientMessage(message) {
    document.getElementById("output").innerHTML += "<p>" + message + "</p >";
}

/*
    Handle any messages that come back down the websocket.
*/
function handleResponse(resp) {
    try {
        let response = JSON.parse(resp.data);
        if (response.type == "error") {
            displayJsonResponse("Server responded with error: " + response.message);
        } else if (response.type == "selfAddress") {
            displayJsonResponse(response);
            ourAddress = response.address;
            displayClientMessage("Our address is:  " + ourAddress + ", we will now send messages to ourself.");
        } else if (response.type == "received") {
            handleReceivedTextMessage(response)
        }
    } catch (_) {
        displayJsonResponse(resp.data)
    }
}

/*
    Handle any string message values that are received through messages sent back to us.
*/
function handleReceivedTextMessage(message) {
    const text = message.message
    displayJsonResponse(text)
}

/*
    Display websocket responses in the Activity Log.
*/
function displayJsonResponse(message) {
    let receivedDiv = document.createElement("div")
    let paragraph = document.createElement("p")
    paragraph.setAttribute('style', 'color: orange')
    let paragraphContent = document.createTextNode("received back >>> " + JSON.stringify(message))
    paragraph.appendChild(paragraphContent)
    
    receivedDiv.appendChild(paragraph)
    document.getElementById("output").appendChild(receivedDiv)
}

main();