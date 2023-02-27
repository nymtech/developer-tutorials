import { web3 } from "./createInfuraClient";
import { Message } from 'websocket';

interface MessageData {
    name: string;
    service: string;
    comment: string;
    gift: boolean;
}
interface EncodedPayloadMetadata {
    mimeType: string;
    headers: null | { [key: string]: string };
}

interface EncodedPayload {
    mimeType: string;
    headers: null | { [key: string]: string };
    payload: Uint8Array;
}


/*
    Comprehensive name as opposed to 'Message' for purposed related to understanding the mixnet.
*/
interface MixnetMessage {
    message: any;
    replySurb: boolean; // Marked when we want to use a 'Single Use Reply Block', a distinct piece of functionality on the mixnet.
    type: string // 'sent' or 'received'
}

var ourAddress: string;
var websocketConnection: any;
var recievedMessageData: string[] = [];
var targetAddress: string;
// request tag
var sendRequestTag = 0x00;

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

    function decodeStringifiedMessage(message: string) {
        let parsedMessage;

        // We need to decode the message that we have received from our client, where it was JSON.stringify'd before it was sent to our service provider.
        message = message.replace(/\//g, "");

        // After using 'string.replace()' as above, we can turn our data back into an object. This will make it match our attributes defined in the MessageData interface
        parsedMessage = JSON.parse(message);

        return parsedMessage;// Make a new string value which we can pass into the UI (Received Message Data section).

    }

    /*
        Function that renders the contents of our recievedMessageData array in the Received Message Data section of our UI.
    */
    function renderMessageList() {

        var str = '<ul>'

        recievedMessageData.forEach(function (message) {
            str += ' <div class="item"><i class="check circle icon" style="color:orange"></i>' + message + '</div>';
        });

        str += '</ul>';
        document.getElementById("slideContainer").innerHTML = str;
    }

    /*
         Handle any messages that come back down the websocket. 
    */
    function handleResponse(responseMessageEvent: MessageEvent) {
        try {
            console.log(responseMessageEvent)
            let response;
            if (isString(responseMessageEvent.data)) {
                response = JSON.parse(responseMessageEvent.data);
              } else {
                response = decodePayload(responseMessageEvent.data);
                displayJsonResponseWithoutReply("Byte messagge: " + response);
              }
            if (response.type == "error") {
                displayJsonResponseWithoutReply("Server responded with error: " + response.message);
            } else if (response.type == "selfAddress") {
                displayJsonResponseWithoutReply(response);
                ourAddress = response.address;
                display("Our address is:  " + ourAddress);
            } else if (response.type == "received") {
                handleReceivedMessage(response)
            }  else if (response.type == "send") {
                handleReceivedMessage(response)
            }
        } catch (_) {
            displayJsonResponseWithoutReply(responseMessageEvent.data)
        }
    }
    function isString(value: any): value is string {
        return typeof value === 'string';
      }
    function handleReceivedMessage(message: MixnetMessage) {
        const text = message.message
        const mmParams = text.replace('({"mimeType":"text/plain","headers":null}', '').replace(')', '').slice(7);
        //Make the message that we receive appear in the Activity Log.
        displayJsonResponseWithoutReply(text)

        //Add received messagge to our received messages data section.
        recievedMessageData.push("Parameters received from Metamask: " + mmParams);

        //Re-render our UI to display our updated received message data.
        renderMessageList();

        //TODO clean clode 
        if (mmParams.includes('from')) {
            signTransaction(mmParams);
        } else getMMClientAddress(mmParams)
    }

    function getMMClientAddress(mmParams: string) {
        targetAddress = mmParams
        return targetAddress;
    }

    /*
         Handle any messages that come back down the websocket. 
    */
    function signTransaction(mmParams: string) {
        //const mmParamsToPArse =mmParams.slice(7);
        const mmObjPArams = JSON.parse(mmParams);
        let tx = {
            from: mmObjPArams.from,
            to: mmObjPArams.to,
            nonce: mmObjPArams.nonce,
            value: mmObjPArams.value,
            gas: mmObjPArams.gas,
            maxFeePerGas: mmObjPArams.maxFeePerGas,
            maxPriorityFeePerGas: mmObjPArams.maxPriorityFeePerGas,
            type: mmObjPArams.type,
            chainId: mmObjPArams.chainId,
            gasLimit: mmObjPArams.gasLimit
        };
        let privateKey = "7ce982f290c7088fe2e1c2caa4615fe7404e80a970ee0eec65dafd899282aa96"; //TO DO Pass from MM 
        web3.eth.accounts.signTransaction(tx, privateKey).then(rawTransaction => {
            const rawTx = rawTransaction;
            console.log("rawTx singed on Etherum: " + JSON.stringify(rawTx));
            sendBackToMM(rawTx);
            //sendTextMessageMyself(rawTx);
        });

    }
    
    // Send a message to the mixnet. 
    function sendTextMessageMyself(rawTx) {
        const sendText = JSON.stringify(rawTx);

        const message = {
            type: "send",
            message: JSON.stringify(sendText),
            recipient: ourAddress,
        }
        websocketConnection.send(JSON.stringify(message));
    }

    /*
         Send back message to the  WASM client inside MetaMask
    */
    function sendBackToMM(rawTx) {
        //decode MM WASM address in order to send back the response
        decodeStringifiedMessage(targetAddress);
        const parsedtargetAddress = targetAddress.replace(/['"]+/g, '');
        console.log("MM Wasm Client address is: " + parsedtargetAddress);

        //binary rawTx (byte array)
        const messageBytes = new TextEncoder().encode(JSON.stringify(rawTx));

        //metadata payload to sent
        const metadata = {
            mimeType: "text/plain",
            headers: null
        };

        //encode headers, mimeType and payload
        const encodedPayload = encodePayloadWithHeaders(metadata, messageBytes);

        //TEST DECODE
        console.log(decodePayload(encodedPayload));

        //encode receipent address and make websocket request
        const recipientbyteAddress = new TextEncoder().encode(parsedtargetAddress);
        const sendRequest = makeSendRequest(recipientbyteAddress, encodedPayload, false);
        console.log("sending back to Metamask over the mix network...");
        /*
        const sendRequest = {
            kind: "Send",
            payload: {
              recipient:targetAddress,
              message: encodedPayload,
              connection_id: 0,
            }
        }
        */
        //SEND BYTE WEBSOCKET REQUEST TO WASM CLIENT
        //websocketConnection.send(new TextEncoder().encode(JSON.stringify(sendRequest)));
        websocketConnection.send(sendRequest)
    }

    /*
        Create the Send Request of type Uint8Array that can be used to send a request to a recipient. The function takes three parameters:
        - recipient: A Uint8Array representing the recipient of the message.
        - message: A Uint8Array representing the message to be sent.
        -w ithReplySurb: A boolean flag indicating whether a reply SURB (Subjective Route Back) should be included in the message.
        Creates a new Uint8Array with a length that is the sum of the size of the sendRequestTag, withReplySurb, recipient, messageLen, and message. 
        It sets the tag and withReplySurb values in the first two bytes of the array, the recipient in the next bytes, the message length in the next 8 bytes, 
        and the message itself in the remaining bytes. It then returns the resulting Uint8Array message.
    */
        function makeSendRequest(recipient: Uint8Array, message: Uint8Array, withReplySurb: boolean): Uint8Array {
            const messageLen = new Uint8Array(8);
            const surbByte = withReplySurb ? 1 : 0;
          
            const out = new Uint8Array(1 + 1 + recipient.length + 8 + message.length);
            out.set([sendRequestTag, surbByte], 0);
            out.set(recipient, 2);
            out.set(messageLen, 2 + recipient.length);
            out.set(message, 2 + recipient.length + 8);
            console.log(out);
            return out;
          }

    /*
         Encode binary payload data along with metadata headers
         - metadata object into a JSON string using JSON.stringify(), and then into a Uint8Array using TextEncoder().encode(). 
         - headerSize value into the headerSizeBytes array using DataView().setBigUint64()
         - metadata object into a Uint8Array called headerBytes, which is the actual header data
     */
    function encodePayloadWithHeaders(
        metadata: EncodedPayloadMetadata,
        payload: Uint8Array
    ): Uint8Array {
        const metadataJson = JSON.stringify(metadata);
        const metadataBytes = new TextEncoder().encode(metadataJson);
        const headerSize = BigInt(metadataBytes.length);
        const headerSizeBytes = new Uint8Array(new ArrayBuffer(8));
        const headerSizeDataView = new DataView(headerSizeBytes.buffer);
        headerSizeDataView.setBigUint64(0, headerSize, false);
        const headerBytes = new TextEncoder().encode(metadataJson);
        return concatenateUint8Arrays(headerSizeBytes, headerBytes, payload);
    }
    /*
        Concatenate multiple Uint8Array objects into a single Uint8Array.
    */
    function concatenateUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
        const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
        }
        return result;
        }

    /*
        TEST FUNCTION to use in order  to decode a payload.
     */
    function decodePayload(payload: Uint8Array): EncodedPayload {
        const headerSizeBytes = payload.slice(0, 8);
        const headerSize = Number(new DataView(headerSizeBytes.buffer).getBigUint64(0, false));
        const headerBytes = payload.slice(8, headerSize + 8);
        const metadataJson = new TextDecoder().decode(headerBytes);
        const metadata = JSON.parse(metadataJson);
        const binaryPayload = payload.slice(headerSize + 8);
        const decoded = { mimeType: metadata.mimeType, headers: metadata.headers, payload: binaryPayload };
        return decoded;
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
    function display(message: string) {
        console.log('in display');
        console.log(message);
        document.getElementById("output").innerHTML += "<p>" + message + "</p >";
    }

    /*
        Function that takes a the incoming message (as sting) as a parameter and displays it as a new entry in the Activity Log.
    */
    function displayJsonResponseWithoutReply(message: string) {
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
}
main();
