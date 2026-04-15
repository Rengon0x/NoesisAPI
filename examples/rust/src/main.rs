// Token preview in Rust
// Run: NOESIS_API_KEY=se_... cargo run -- <MINT>

use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = env::var("NOESIS_API_KEY")
        .expect("Set NOESIS_API_KEY — get one at https://noesisapi.dev/keys");

    let mint = env::args().nth(1).expect("Usage: cargo run -- <MINT>");

    let url = format!("https://noesisapi.dev/api/v1/token/{mint}/preview");
    let res = reqwest::Client::new()
        .get(&url)
        .header("X-API-Key", api_key)
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    println!("{}", serde_json::to_string_pretty(&res)?);
    Ok(())
}
