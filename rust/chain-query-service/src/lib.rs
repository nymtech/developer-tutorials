use anyhow::bail;
use cosmrs::AccountId;
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

#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub struct BalanceRequest {
    pub validator: String,
    pub account: AccountId,
}

#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub struct BalanceResponse {
    pub balance: Coin,
}

#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub enum RequestTypes {
    Balance(BalanceRequest),
}

impl RequestTypes {
    pub fn serialize(&self) -> Vec<u8> {
        serde_json::to_vec(self).expect("serde failure")
    }

    pub fn try_deserialize<M: AsRef<[u8]>>(raw: M) -> anyhow::Result<Self> {
        serde_json::from_slice(raw.as_ref()).map_err(Into::into)
    }
}

#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub enum ResponseTypes {
    Balance(BalanceResponse),
}

impl ResponseTypes {
    pub fn serialize(&self) -> Vec<u8> {
        serde_json::to_vec(self).expect("serde failure")
    }

    pub fn try_deserialize<M: AsRef<[u8]>>(raw: M) -> anyhow::Result<Self> {
        serde_json::from_slice(raw.as_ref()).map_err(Into::into)
    }
}

// create our client with specified path for key storage
pub async fn create_client(config_path: PathBuf) -> MixnetClient {
    let config_dir = config_path;
    let storage_paths = StoragePaths::new_from_dir(&config_dir).unwrap();
    let client = MixnetClientBuilder::new_with_default_storage(storage_paths)
        .await
        .unwrap()
        .build()
        .unwrap();

    client.connect_to_mixnet().await.unwrap()
}

pub async fn wait_for_non_empty_message(
    client: &mut MixnetClient,
) -> anyhow::Result<ReconstructedMessage> {
    while let Some(mut new_message) = client.wait_for_messages().await {
        if !new_message.is_empty() {
            return Ok(new_message.pop().unwrap());
        }
    }

    bail!("did not receive any non-empty message")
}

pub fn handle_response(message: ReconstructedMessage) -> anyhow::Result<ResponseTypes> {
    ResponseTypes::try_deserialize(message.message)
}

pub fn handle_request(
    message: ReconstructedMessage,
) -> anyhow::Result<(RequestTypes, Option<AnonymousSenderTag>)> {
    let request = RequestTypes::try_deserialize(message.message)?;
    Ok((request, message.sender_tag))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn balance_response_serialization() {
        let response = ResponseTypes::Balance(BalanceResponse {
            balance: Coin::new(2399992158, "unym"),
        });

        let expected = b"{\"Balance\":{\"balance\":{\"amount\":2399992158,\"denom\":\"unym\"}}}";

        assert_eq!(expected, response.serialize().as_slice())
    }

    #[test]
    fn parsing_balance_response() {
        let received = "{\"Balance\":{\"balance\":{\"amount\":2399992158,\"denom\":\"unym\"}}}";
        let expected = ResponseTypes::Balance(BalanceResponse {
            balance: Coin::new(2399992158, "unym"),
        });

        assert_eq!(expected, ResponseTypes::try_deserialize(received).unwrap())
    }
}
