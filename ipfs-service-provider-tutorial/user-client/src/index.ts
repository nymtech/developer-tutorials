// The address that is given to us from our mixnet client.
var ourAddress: string;

// Address we want to send our messages to. Replace it with the address of your Service Provider's Nym client!
var targetAddress: string = 'FR2dKwFTFDPN1DSBUehbWea5RXTEf2tQGUz1L7RsxGHT.QndBs9qMtNH5s3RXmnP96FgzAeFV6nwLNB6hrGGvUN2@62F81C9GrHDRja9WCqozemRFSzFPMecY85MbGwn6efve';

// Variable that holds our websocket connection data.
var websocketConnection: any;

const fileInput = document.querySelector('#fileInput');
var selectedPayload: any;

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
    fileInput.addEventListener('change', onFileChange, false);
}

/*
    Get our own client address to log in the activity log so we know what our address is in the mixnet via our application UI
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
       type: "sendAnonymous",
       message: JSON.stringify(messageContentToSend),
       recipient: targetAddress,
       replySurbs: 5
   }
   
   //Display our json data to ber sent
   displayJsonSend(message);
   
   //Send our message object via out via our websocket connection.
   websocketConnection.send(JSON.stringify(message));
}

/*
   Display responses into our activity log.
*/
function displayJsonSend(message){

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
   Connect to a websocket. 
*/
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
function displayClientMessage(message) {
    document.getElementById("output").innerHTML += "<p>" + message + "</p >";
}

/*
    Handle any messages that come back down the websocket.
*/
function handleResponse(resp) {
    let response = JSON.parse(resp.data);
    try {
        //let response = JSON.parse(resp.data);
        console.log(response);
        if (response.type == "error") {
            displayJsonResponse("Server responded with error: " + response.message);
        } else if (response.type == "selfAddress"){
            displayJsonResponse(response);
        } else if (response.type == "received"){
            handleReceivedTextMessage(response);
        }
    } catch (_) {
        displayJsonResponse(response);
    }
}

/*
    Handle any string message values that are received through messages sent back to us.
*/
function handleReceivedTextMessage(message) {
    const text = JSON.parse(message.message);
    displayJsonResponse(text);
}

/*
    Functions that will display 'send' related event logs into our activity log.
*/
function displayJsonResponse(message) {
    //Variables that will get us the date and time value of when we receive the uploaded file. 
    const timeElapsed = Date.now();
    const today = new Date(timeElapsed);
    
    let receivedDiv = document.createElement("div");
    //Our olf variable in the SSP - `paragraph` becomes messageLine1
    let messageLine1 = document.createElement("p");
    //We add another line so we have extra space for additional useful information pertaining to our received data.
    let messageLine2 = document.createElement("p");

    //Setting the styling of our lines.
    messageLine1.setAttribute('style', 'color: orange;word-break: break-word;');
    messageLine2.setAttribute('style', 'color: orange;word-break: break-word;');

    //Declare two variables that will hold message data, ready to be populated based on the type when it enters the logic below.
    let line1Contents;
    let line2Contents;

    var downloadFileButton = document.createElement("button");

    if (message.type == 'selfAddress'){
        //Display our self address.
        ourAddress = message.address;
        line1Contents = document.createTextNode("Initialized Mixnet Websocket.");
        line2Contents = document.createTextNode('Our address : ' + message.address);
    }

    if (message.type == 'received'){

        //Display the time and name of the uploaded file.
        let parsedMessageContents = JSON.parse(message.message);

        console.log(parsedMessageContents);

        //Insert this if statement in the download implementation of the tutorial
        if(parsedMessageContents.downloadableFileData){
            executeFileDownload(parsedMessageContents.downloadableFileData,parsedMessageContents.fileName,parsedMessageContents.fileType)
            return;
        } else {
            //Creating a data log object to display on our UI
            let dataLog = {
                url : 'https://ipfs.io/ipfs/' + parsedMessageContents.fileCid,
                name: parsedMessageContents.filePath,
                time : today.toUTCString()
            }

            line1Contents = document.createTextNode("⬇ " + dataLog.time + " | " + dataLog.name);
            line2Contents = document.createTextNode('Link: ' + dataLog.url);

            downloadFileButton.innerHTML = 'Download File';
            downloadFileButton.onclick = function(){sendDownloadRequest(parsedMessageContents.fileCid,parsedMessageContents.filePath,parsedMessageContents.fileType)}
        }
    }

    messageLine1.appendChild(line1Contents);
    messageLine2.appendChild(line2Contents);
    
    receivedDiv.appendChild(messageLine1);
    receivedDiv.appendChild(messageLine2);

    if (message.type == 'received'){
        receivedDiv.appendChild(downloadFileButton);
    }
    
    document.getElementById("output").appendChild(receivedDiv);
}

function sendDownloadRequest(cid : string, path : string,type : string){

    console.log(path);
    
    var messageContentToSend  = {
        fileCid : cid,
        fileName : path,
        fileType : type
   };  
   
   /*We have to send a string to the mixnet for it to be a valid message , so we use JSON.stringify to make our object into a string.*/
   const message = {
       type: "sendAnonymous",
       message: JSON.stringify(messageContentToSend),
       recipient: targetAddress,
       replySurbs: 5
   }
   
   displayClientMessage('Download request for file with hash ' + cid + ' sent.');

   //Send our message object via out via our websocket connection.
   websocketConnection.send(JSON.stringify(message));
}

async function executeFileDownload(data : any,path : string,type : string){

    const fileName = path;
    var fileBlob : any;

    if(type.startsWith('text')){
        const encoder = new TextEncoder();
        fileBlob = new Blob([encoder.encode(data)], { type: type });
    } else {
        const uint8Array = new Uint8Array(data.data);
        fileBlob = new Blob([uint8Array], { type: type });
    }
    const fileUrl = URL.createObjectURL(fileBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = fileUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

main();
