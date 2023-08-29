use crate::{handle_response, wait_for_non_empty_message, RequestTypes, DEFAULT_VALIDATOR_RPC};
use cosmrs::AccountId;
use nym_sdk::mixnet::MixnetClient;
use nym_sphinx_addressing::clients::Recipient;
use nym_sdk::mixnet::MixnetMessageSender;
use nym_validator_client::nyxd::Coin;

pub async fn query_balance(
    account: AccountId,
    client: &mut MixnetClient,
    sp_address: Recipient,
) -> anyhow::Result<Coin> {
    // construct balance request
    let message = RequestTypes::Balance(crate::BalanceRequest {
        validator: DEFAULT_VALIDATOR_RPC.to_owned(), // rpc endpoint for broadcaster to use
        account,
    });

    // send serialised request to service via mixnet
    client
        .send_message(sp_address, message.serialize(), Default::default())
        .await;

    let received = wait_for_non_empty_message(client).await?;

    // listen for response from service
    let sp_response = handle_response(received)?;

    // match JSON -> ResponseType
    let res = match sp_response {
        crate::ResponseTypes::Balance(response) => {
            println!("{:#?}", response);
            response.balance
        }
    };

    Ok(res)
}
