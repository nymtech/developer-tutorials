import Web3 from "web3";

export const web3 = new Web3(
  new Web3.providers.HttpProvider(
    //TODO this must be send from MM + add config for API key from infura 
    "https://goerli.infura.io/v3/a50edc81cc3f4c12a1baff9086fddd1d"
  )
);
  
  