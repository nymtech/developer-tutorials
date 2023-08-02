use crate::{listen_and_parse_response, DEFAULT_VALIDATOR_RPC};
use cosmrs::AccountId;
use nym_sdk::mixnet::MixnetClient;
use nym_sphinx_addressing::clients::Recipient;
use nym_validator_client::nyxd::Coin;

pub async fn query_balance(
    account: AccountId,
    client: &mut MixnetClient,
    sp_address: Recipient,
) -> anyhow::Result<Coin> {
    // construct balance request
    let message = crate::BalanceRequest {
        validator: DEFAULT_VALIDATOR_RPC.to_owned(), // rpc endpoint for broadcaster to use
        account,
    };

    // send serialised request to service via mixnet
    client
        .send_str(sp_address, &serde_json::to_string(&message)?)
        .await;

    // listen for response from service
    let sp_response = listen_and_parse_response(client).await?;

    // match JSON -> ResponseType
    let res = match sp_response {
        crate::ResponseTypes::Balance(response) => {
            println!("{:#?}", response);
            response.balance
        }
    };

    Ok(res)
}
