// Full token scan with top traders, security flags, holder metrics
// Run: NOESIS_API_KEY=se_... node token-scan.mjs <MINT>

const apiKey = process.env.NOESIS_API_KEY;
if (!apiKey) {
  console.error("Set NOESIS_API_KEY — get one at https://noesisapi.dev/keys");
  process.exit(1);
}

const mint = process.argv[2];
if (!mint) {
  console.error("Usage: node token-scan.mjs <MINT>");
  process.exit(1);
}

const res = await fetch(`https://noesisapi.dev/api/v1/token/${mint}/scan`, {
  headers: { "X-API-Key": apiKey },
});

if (!res.ok) {
  console.error(`HTTP ${res.status}:`, await res.text());
  process.exit(1);
}

console.log(JSON.stringify(await res.json(), null, 2));
