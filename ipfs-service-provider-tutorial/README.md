IPFS Service Provider

The code for the second Nym developer tutorial, the sequel to the Simple Service Provider Tutorial. Using the previous code as a base for the project, we have made amends to it to construct a Service Provider in Typescript that can upload , retrieve and download file via the Mixnet.

You can find the tutorial here : (Link TBD)

Setup
Each component requires a Nym Websocket Client to communicate with the mixnet. The User Client code listens for a websocket connection on port 1977, and the Service Provider on 1978.

Service Provider:
```
cd service-provider
npm install 
npm run start:dev 
```

User Client:
```
cd user-client 
npm install 
npm start
```

Once your Service Providers `nym-client` is up and running (on port 1978), navigate to `index.ts` within the `/user-client/src` directory and populate `targetAddress` with the output address that it returns.

The recommended minimum Node version to run this code is 16.14.0 (vnm use 16)