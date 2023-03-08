import WebSocket, { MessageEvent } from "ws";
import { create } from 'ipfs-core'
import fetch from 'node-fetch';

var ourAddress: string;
var websocketConnection: any;

var ipfsNode: any;
var ipfsVersion: any;

async function main() {
  var port = '1978' 
  var localClientUrl = "ws://127.0.0.1:" + port;

  // Set up and handle websocket connection to our desktop client.
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

  ipfsNode = await create();
  ipfsVersion = await ipfsNode.version();

  console.log('IPFS Version:', ipfsVersion.version);
}

// Handle any messages that come back down the websocket. 
function handleResponse(responseMessageEvent : MessageEvent) {
  try {
      let response = JSON.parse(responseMessageEvent.data.toString());
      if (response.type == "error") {
        console.log("\x1b[91mAn error occured: " + response.message + "\x1b[0m")
      } else if (response.type == "selfAddress") {
        ourAddress = response.address;
        console.log("\x1b[94mOur address is: " + ourAddress + "\x1b[0m")
      } else if (response.type == "received") {
        let messageContent = JSON.parse(response.message)

        //Insert this if statement in the download implementation of the tutorial
        if(messageContent.fileCid){
            console.log('\x1b[93mRecieved download request: \x1b[0m');
            console.log('\x1b[92mFile hash : ' + messageContent.fileCid + '\x1b[0m');
            getAndSendBackDownloadableFile(messageContent.fileCid,messageContent.fileName,response.senderTag);
        } else {
            console.log(response);
            console.log(messageContent);

            console.log('\x1b[93mRecieved : \x1b[0m');
            console.log('\x1b[92mName : ' + messageContent.name + '\x1b[0m');
            console.log('\x1b[92mLast Modified : ' + messageContent.lastModifiedDate + '\x1b[0m');
            console.log('\x1b[92mType : ' + messageContent.type + '\x1b[0m');
            console.log('\x1b[92mSize : ' + readFileSize(messageContent.size) + '\x1b[0m');

            console.log('\x1b[93mUploading file to IPFS... \x1b[0m')

            uploadToIPFS(messageContent,response.senderTag)
        }

      }
  } catch (_) {
        console.log('something went wrong in handleResponse')
  }
}

async function uploadToIPFS(dataToUpload : any,senderTag : string) {
  let fileContent;

  if (dataToUpload.type.startsWith('text')) {

    const blob = await fetch(dataToUpload.dataUrl).then((response: { blob: () => any; }) => response.blob());
    fileContent = await blob.arrayBuffer();

  } else if (dataToUpload.type.startsWith('image')) {
    // For images, convert the data URL to a Blob and pass the Blob as the content
    const blob = await fetch(dataToUpload.dataUrl).then((response: { blob: () => any; }) => response.blob());
    fileContent = await blob.arrayBuffer();
  } else {

    fileContent = dataToUpload.dataUrl;
  }

  const file = await ipfsNode.add({
    path: dataToUpload.name,
    content: fileContent
  })

  console.log('Added file:', file.path, file.cid.toString())

  let filedatatodl = await ipfsNode.get(file.cid);

  console.log(filedatatodl)

  sendMessageToMixnet(file.path,file.cid.toString(),senderTag)
}

function sendMessageToMixnet(path: string,cid: string,senderTag: string) {

  // Place each of the form values into a single object to be sent.
  const messageContentToSend = {
      text: 'We recieved your request - this reply sent to you anonymously with SURBs',
      fromAddress : ourAddress,
      filePath : path,
      fileCid : cid
  }
  
  const message = {
      type: "reply",
      message: JSON.stringify(messageContentToSend),
      senderTag: senderTag
  }
  
  // Send our message object via out via our websocket connection.
  websocketConnection.send(JSON.stringify(message));

}

// Send a message to the mixnet client, asking what our own address is. 
function sendSelfAddressRequest() {
  var selfAddress = {
      type: "selfAddress"
  }
  websocketConnection.send(JSON.stringify(selfAddress));
}

function readFileSize(bytes : number, si=false, dp=1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si 
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + ' ' + units[u];
}

async function getAndSendBackDownloadableFile(cid : string,name : string,senderTag: string){
    let data : any;

    //data = await ipfsNode.get(cid);

    //console.log(data);

    const entries = await ipfsNode.ls(cid);

    const stream = ipfsNode.cat(cid)
    const decoder = new TextDecoder()
   
    for await (const chunk of stream) {
    // chunks of data are returned as a Uint8Array, convert it back to a string
        data += decoder.decode(chunk, { stream: true })
    }

    const messageContentToSend = {
        text: 'We received your download request - this reply sent to you anonymously with SURBs',
        fromAddress : ourAddress,
        downloadableFileData : data,
        fileName : name
    }
    
    const message = {
        type: "reply",
        message: JSON.stringify(messageContentToSend),
        senderTag: senderTag
    }
    
    // Send our message object via out via our websocket connection.
    websocketConnection.send(JSON.stringify(message));
    
}

// Function that connects our application to the mixnet Websocket. We want to call this first in our main function.
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
