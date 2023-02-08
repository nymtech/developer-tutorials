import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { IpfsService } from './ipfs.service';
import { PeerId } from '@libp2p/interface-peer-id';
import { webSocket, WebSocketSubject } from "rxjs/webSocket";
import { FileLogData } from './file-log-data';
import { ConditionalExpr } from '@angular/compiler';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {

  @ViewChild('fileInput')
  fileInputReference!: ElementRef;

  title = 'browser-angular';
  ipfsId: PeerId | null = null;
  ipfsVersion: string | null  = null;
  ipfsClientStatus: string | null  = null;

  currentSelectedSingleFile : any = null;
  currentSelectedSingleFileBlob : string = '';
  selectedFileInfo : string = '';

  dataLogItems : any[] = [];

  port = '1978'
  targetMixnetAddress : string = 'CuERihx3cBjCJto7XEequFVkKpbqc5rjCZEqad3nRAjz.54ka55cZTEkjzybb6h189mozgmpqn62rgnQqejyvjKfW@EBT8jTD8o4tKng2NXrrcrzVhJiBnKpT1bJy5CMeArt2w';

  constructor(private IPFSService: IpfsService) {
    const websocketSubject = webSocket({
      url: 'ws://localhost:' + this.port,
      deserializer: (e) =>{
        console.log(e);
        if(e.type == 'message'){
          if(typeof(e.data) == 'string'){
            let jsonParsedMessage = JSON.parse(e.data);
            console.log(jsonParsedMessage)
            this.processMessage(jsonParsedMessage.message,websocketSubject);
          } else {
            e.data.text().then((message: string) => {
              let jsonParsedMessage = JSON.parse(this.trimMessage(message));
              console.log(jsonParsedMessage)
              this.processMessage(jsonParsedMessage,websocketSubject);
            })
          }
        }
      }
    });
    
  
    websocketSubject.subscribe({
      next: response => {
        console.log('Subject: message received: ' + response)
        // Called whenever there is a message from the server.
      },
      error: err => {
        console.log('Subject: error received: ' + err)
        // Called if at any point WebSocket API signals some kind of error.
      }, 
      complete: () => console.log('Subject: complete') // Called when connection is closed (for whatever reason).
    });
  }

  /* 
     Function that remove any unwanted trailing characters behind the first json curly brace.
  */
  trimMessage(message : string){
    let index = message.indexOf("{");
    let trimmedMessage = message.substring(index);
    return trimmedMessage;
  }

  ngOnInit() {
    this.initializeApplication();
  }

  async initializeApplication() {
    const id = await this.IPFSService.getId();
    this.ipfsId = id.id;

    const version = await this.IPFSService.getVersion();
    this.ipfsVersion = version.version

    const status = await this.IPFSService.getStatus();
    this.ipfsClientStatus = status ? 'Online' : 'Offline'
  }

  async processMessage(response : any,websocketSubject : WebSocketSubject<any>){

    let message = response;
    let blob : any;
    console.log(message);
    if (typeof(message) == 'string'){
        let parsedMessage = JSON.parse(message);
  
        this.dataUrlToBlob(parsedMessage.dataUrl,parsedMessage.type).then( blobValue => {
            blob = blobValue
        }).then( async() => {
          const filesAdded = await this.IPFSService.addFile({path: message.name,content: blob},'Client');
          parsedMessage.cid = filesAdded.cid;
        }).then( () => {
          let messageContent = {
            url : 'https://ipfs.io/ipfs/' + parsedMessage.cid,
            name : parsedMessage.name,
            dataUrl : parsedMessage.dataUrl
          }
    
          const mixnetMessage = {
            type: "send",
            message: JSON.stringify(messageContent),
            recipient: this.targetMixnetAddress,
            withReplySurb: false,
          }
    
          //sends the messaqge to the mixnet via websocket.
          websocketSubject.next(mixnetMessage);
    
          this.logData(parsedMessage,'Client'); 
        })
    } else if(typeof(message) == 'object'){
  
        this.dataUrlToBlob(message.dataUrl,message.type).then( blobValue => {
            blob = blobValue
        }).then( async() => {
          const filesAdded = await this.IPFSService.addFile({path: message.name,content: blob},'Client');
          message.cid = filesAdded.cid;
        }).then( () => {
          let messageContent = {
            url : 'https://ipfs.io/ipfs/' + message.cid,
            name : message.name,
            dataUrl : message.dataUrl
          }
    
          const mixnetMessage = {
            type: "send",
            message: JSON.stringify(messageContent),
            recipient: this.targetMixnetAddress,
            withReplySurb: false,
          }
    
          //sends the messaqge to the mixnet via websocket.
          websocketSubject.next(mixnetMessage);
    
          this.logData(message,'Client');
        })
    }
  }

  async dataUrlToBlob(dataURI : string,type : string){
    var byteString = atob(dataURI.split(',')[1]);
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: type });
  }

  /*
    Logs data into our data log section of the UI.
  */
  logData(file: any,methodOfRequest: string){

      let fileLog! : FileLogData
      let dateTime = new Date()
  
      if(methodOfRequest == 'Manual'){
          fileLog  = {
          name : file.name,
          type : file.type,
          methodOfRequest : 'Manual Upload',
          size : this.readFileSize(file.size),
          dateTime : dateTime.toUTCString(),
          lastModifiedDate : file.lastModifiedDate,
          dataUrl: this.currentSelectedSingleFileBlob,
          cid: file.cid
        }
      } else if (methodOfRequest == 'Client'){
          fileLog = {
          name : file.name,
          type : file.type,
          methodOfRequest : 'Client Upload',
          size : this.readFileSize(file.size),
          dateTime : dateTime.toUTCString(),
          lastModifiedDate : file.lastModifiedDate,
          dataUrl: file.dataUrl,
          cid: file.cid
        }
      }
  
      this.dataLogItems.push(fileLog);
      this.resetFileInput();
  }

  readFileSize(bytes : number, si=false, dp=1) {
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

  /*
    Resets the file input variable, clearing the value for the next manual upload.
  */
  resetFileInput() {
      this.currentSelectedSingleFileBlob = '';
      this.fileInputReference.nativeElement.value = "";
  }

  /*
    Uploads a file manually to IPFS when the Upload button is pressed, after selecting a file from the input above it.
  */
  async uploadFile(file: any){
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.addEventListener('load', (e) => {
      this.getBlobAndUpload(e)
    });
  }

  async getBlobAndUpload(event : any) {
    this.currentSelectedSingleFileBlob = event.target.result;    

    const filesAdded = await this.IPFSService.addFile({path: this.currentSelectedSingleFile.name,content: this.currentSelectedSingleFile},'Manual');
    console.log("Added file:", filesAdded.path, filesAdded.cid);

    this.currentSelectedSingleFile.cid = filesAdded.cid;
    this.logData(this.currentSelectedSingleFile,'Manual');
  }

  /*
   Called when the value of the file input changes, i.e. when a file has been selected for upload.
  */
   onFileSelect(input: HTMLInputElement){

    function formatBytes(bytes: number): string {
      const UNITS = ['Bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const factor = 1024;
      let index = 0;

      while (bytes >= factor) {
        bytes /= factor;
        index++;
      }

      return `${parseFloat(bytes.toFixed(2))} ${UNITS[index]}`;
    }

    const file = input!.files![0];
    this.currentSelectedSingleFile = file;
    this.selectedFileInfo = `${file.name} (${formatBytes(file.size)})`;
  }
}
  



