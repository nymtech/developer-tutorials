# Simple Service Provider 

The code for the first Nym developer tutorial, building a simple Service Provider and some client-side code for sending messages through the mixnet. 

You can find the tutorial [here](https://nymtech.net/developers/tutorials/simple-service-provider.html).

## Setup 
* Each component requires a Nym Websocket Client to communicate with the mixnet. The User Client code listens for a websocket connection on port 1977, and the Service Provider on 1978. 
* Service Provider: 
```
cd service-provider
npm install 
npm run start:dev 
```
* User Client: 
```
cd user-client 
npm install 
npm start
```

