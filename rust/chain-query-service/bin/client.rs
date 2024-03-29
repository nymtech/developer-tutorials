use clap::{Args, Parser, Subcommand};
use chain_query::{client::query_balance, create_client};
use nym_sdk::mixnet::Recipient;
use nym_validator_client::nyxd::AccountId;
use nym_bin_common::logging::setup_logging; 

#[derive(Debug, Parser)]
#[clap(name = "rust sdk demo - chain query service")]
#[clap(about = "query the sandbox testnet blockchain via the mixnet... part 2 coming soon")]
struct Cli {
    #[clap(subcommand)]
    command: Option<Commands>,
}

#[derive(Debug, Subcommand)]
enum Commands {
    QueryBalance(QueryBalance),
}

#[derive(Debug, Args)]
struct QueryBalance {
    /// the account we want to query
    account: AccountId,
    /// the address of the broadcaster service - this submits txs and queries the chain on our behalf
    sp_address: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    setup_logging();
    let cli = Cli::parse();
    let mut client = create_client("/tmp/client2".into()).await;
    let our_address = client.nym_address();
    println!("\nclient's nym address: {our_address}");

    match cli.command {
        Some(Commands::QueryBalance(QueryBalance {
            account,
            sp_address,
        })) => {
            println!("\nsending bank balance request to service via mixnet\n");
            let sp_address = Recipient::try_from_base58_string(sp_address).unwrap();
            let returned_balance = query_balance(account, &mut client, sp_address).await?;
            println!("\nreturned balance is: {}", returned_balance);
        }
        None => {
            println!("\nno command specified - nothing to do")
        }
    }
    println!("\ndisconnecting client\n");
    client.disconnect().await;
    println!("client disconnected\n");
    Ok(())
}
