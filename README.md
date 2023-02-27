# NYM SP & native client for MM communication  
A Service Provider  written in TypeScript that listens the nym-client and receives messages from the mixnet send via Metamask.
## Building locally

Inside te Service Provider forlder open a terminal and run run `npm start`.

Inside the main folder where the nym-client is located run:
```
./nym-client init --id service-provider --port 1978
 ./nym-client run --id service-provider             
```
