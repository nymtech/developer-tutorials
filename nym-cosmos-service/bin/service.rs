use nym_bin_common::logging::setup_logging;
use nym_cosmos_service::{
    create_client, listen_and_parse_request,
    service::{create_broadcaster, get_balance},
    BalanceResponse, RequestTypes,
};
use nym_sphinx_anonymous_replies::{self, requests::AnonymousSenderTag};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // setup_logging();
    let mut client = create_client("/tmp/service2".into()).await;
    let our_address = client.nym_address();
    println!("\nservice's nym address: {our_address}");
    // the httpclient we will use to broadcast our signed tx to the blockchain
    let broadcaster = create_broadcaster().await?;
    println!("listening for messages, press CTRL-C to exit");

    loop {
        // listen out for incoming requests from mixnet, parse and match them
        let request: (RequestTypes, AnonymousSenderTag) =
            listen_and_parse_request(&mut client).await?;
        // grab sender_tag from parsed request for anonymous replies
        let return_recipient: AnonymousSenderTag = request.1;
        match request.0 {
            RequestTypes::Balance(request) => {
                println!("\nincoming balance request for: {}\n", request.account);

                let balance: BalanceResponse =
                    get_balance(broadcaster.clone(), request.account).await?;

                println!("{:#?}", balance);

                println!("\nreturn recipient surb bucket: {}", &return_recipient);
                println!("\nsending response to {}", &return_recipient);
                // send response back to anon requesting client via mixnet
                client
                    .send_str_reply(return_recipient, &serde_json::to_string(&balance)?)
                    .await;
            }
        }
    }
}
