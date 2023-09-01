use chain_query::{
    create_client, handle_request,
    service::{create_broadcaster, get_balance},
    BalanceResponse, RequestTypes, ResponseTypes,
};
use nym_sphinx_anonymous_replies::{self, requests::AnonymousSenderTag};
use nym_bin_common::logging::setup_logging;
use nym_sdk::mixnet::MixnetMessageSender;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    setup_logging();
    let mut client = create_client("/tmp/service2".into()).await;
    let our_address = client.nym_address();
    println!("\nservice's nym address: {our_address}");
    // the httpclient we will use to broadcast our query to the blockchain
    let broadcaster = create_broadcaster().await?;
    println!("listening for messages, press CTRL-C to exit");

    while let Some(received) = client.wait_for_messages().await {
        for msg in received {
            let request = match handle_request(msg) {
                Ok(request) => request,
                Err(err) => {
                    eprintln!("failed to handle received request: {err}");
                    continue;
                }
            };

            let return_recipient: AnonymousSenderTag = request.1.expect("no sender tag received");
            match request.0 {
                RequestTypes::Balance(request) => {
                    println!("\nincoming balance request for: {}\n", request.account);

                    let balance: BalanceResponse =
                        get_balance(broadcaster.clone(), request.account).await?;

                    let response = ResponseTypes::Balance(balance);

                    println!("response from chain: {:#?}", response);

                    println!("\nreturn recipient surb bucket: {}", &return_recipient);
                    println!("\nsending response to {}", &return_recipient);
                    // send response back to anon requesting client via mixnet
                    let _ = client
                        .send_reply(return_recipient, &serde_json::to_string(&response)?)
                        .await;
                }
            }
        }
    }

    Ok(())
}
