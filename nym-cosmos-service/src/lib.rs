use cosmrs::{tendermint, AccountId};
use nym_sdk::mixnet::{
    AnonymousSenderTag, MixnetClient, MixnetClientBuilder, ReconstructedMessage, StoragePaths,
};
use nym_validator_client::nyxd::Coin;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
pub mod client;
pub mod service;

pub const DEFAULT_VALIDATOR_RPC: &str = "https://sandbox-validator1.nymtech.net";
pub const DEFAULT_DENOM: &str = "unym";
pub const DEFAULT_PREFIX: &str = "n";


#[derive(Debug, Serialize, Deserialize)]
pub struct BalanceRequest {
    pub validator: String,
    pub account: AccountId,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BalanceResponse {
    pub balance: Coin
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum RequestTypes {
    Balance(BalanceRequest),
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum ResponseTypes {
    Balance(BalanceResponse),
}

// create our client with specified path for key storage
pub async fn create_client(config_path: PathBuf) -> MixnetClient {
    let config_dir = config_path;
    let storage_paths = StoragePaths::new_from_dir(&config_dir).unwrap();
    let client = MixnetClientBuilder::new_with_default_storage(storage_paths)
        .await
        .unwrap()
        .build()
        .await
        .unwrap();

    client.connect_to_mixnet().await.unwrap()
}

// parse returned response from service: ignore empty SURB data packets + parse incoming message to struct or error
pub async fn listen_and_parse_response(client: &mut MixnetClient) -> anyhow::Result<ResponseTypes> {
    let mut message: Vec<ReconstructedMessage> = Vec::new();

    // get the actual message - discard the empty vec sent along with the SURB topup request
    while let Some(new_message) = client.wait_for_messages().await {
        if new_message.is_empty() {
            println!("\ngot a request for more SURBs from service - sending top up SURBs");
            continue;
        }
        message = new_message;
        break;
    }

    // parse vec<u8> -> JSON String
    let mut parsed = String::new();
    if let Some(r) = message.iter().next() {
        parsed = String::from_utf8(r.message.clone())?;
    }

    println!("debug {:#?}", parsed);

    let sp_response: crate::ResponseTypes = serde_json::from_str(&parsed)?;
    Ok(sp_response)
}

// parse incoming request: parse incoming message to struct + get sender_tag for SURB reply
pub async fn listen_and_parse_request(
    client: &mut MixnetClient,
) -> anyhow::Result<(RequestTypes, AnonymousSenderTag)> {
    let mut message: Vec<ReconstructedMessage> = Vec::new();

    // println!("{:#?}", message);

    // get the actual message - discard the empty vec sent along with the SURBs
    while let Some(new_message) = client.wait_for_messages().await {
        if new_message.is_empty() {
            println!("\ngot empty vec - probably SURBs ");
            continue;
        }
        message = new_message;
        break;
    }

    // parse vec<u8> -> JSON String
    let mut parsed = String::new();
    if let Some(r) = message.iter().next() {
        parsed = String::from_utf8(r.message.clone())?;
    }

    // println!("debug {:#?}", parsed);

    let client_request: crate::RequestTypes = serde_json::from_str(&parsed)?;

    // get the sender_tag for anon reply
    let return_recipient = message[0].sender_tag.unwrap();

    Ok((client_request, return_recipient))
}
