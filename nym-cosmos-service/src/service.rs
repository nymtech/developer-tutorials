use crate::{DEFAULT_DENOM, DEFAULT_VALIDATOR_RPC, BalanceResponse};
use cosmrs::rpc::HttpClient;
use cosmrs::AccountId;
use nym_validator_client::nyxd::{Coin, CosmWasmClient};

pub async fn create_broadcaster() -> anyhow::Result<HttpClient> {
    let broadcaster: HttpClient = HttpClient::new(DEFAULT_VALIDATOR_RPC)?;
    Ok(broadcaster)
}

pub async fn get_balance(
    broadcaster: HttpClient,
    account: AccountId,
) -> anyhow::Result<BalanceResponse> {
    let balance = broadcaster
        .get_balance(&account, DEFAULT_DENOM.to_string())
        .await
        .unwrap()
        .unwrap();
    Ok(BalanceResponse {
        balance: Coin {
            amount: balance.amount,
            denom: balance.denom
        }
        // amount: balance.amount,
        // denom: balance.denom,
    })
}
