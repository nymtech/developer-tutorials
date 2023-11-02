Query the balance of account on Sandbox testnet blockchain through the mixnet with the Rust SDK.

[//]: # (_Laying the groundwork for upcoming pt2: generating a bandwidth credential._)
pt2 additions: 
- change network to sandbox instead of mainnet 
- make it a bandwidth client 
- add request for bandwidth to client 
- send the token to service (log for now? use J's code to do _something_ with it?)

## Usage
```
# console window #1
cargo run --bin service

# copy the service's Nym address from the terminal

# console window #2
cargo run --bin client query-balance n1lcutqz94k739s39u26rvexql40ehf42zd27fwe <SERVICE_ADDRESS_FROM_CLIPBOARD>
```
