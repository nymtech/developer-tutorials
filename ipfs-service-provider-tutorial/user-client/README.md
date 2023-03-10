IPFS Service Provider using Nym Client Websocket - User Client Code

Setup the project using 'npm install'

Run the application using 'npm start'

The default browser location youll find the application will be:
 http://localhost:1234/
 
Populate `targetAddress` in `index.ts` with the address that is provider by the service-providers instance of `nym-client` (running on port 1978 by default).

User Client's `nym-client` Quickstart:

After following https://nymtech.net/docs/binaries/building-nym.html , navigate to `target/release` within the `nym` folder and execute the following in your terminal:

```
./nym-client init --id ipfs-user-client
./nym-client run --id ipfs-user-client

```
