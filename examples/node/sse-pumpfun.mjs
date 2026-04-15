// Live PumpFun new-token stream via SSE
// Run: NOESIS_API_KEY=se_... node sse-pumpfun.mjs

const apiKey = process.env.NOESIS_API_KEY;
if (!apiKey) {
  console.error("Set NOESIS_API_KEY — get one at https://noesisapi.dev/keys");
  process.exit(1);
}

const res = await fetch("https://noesisapi.dev/api/v1/stream/pumpfun/new-tokens", {
  headers: { "X-API-Key": apiKey, accept: "text/event-stream" },
});

if (!res.ok || !res.body) {
  console.error(`HTTP ${res.status}`);
  process.exit(1);
}

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

console.log("Listening for new PumpFun tokens... (Ctrl+C to stop)\n");

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (line.startsWith("data:")) {
      const payload = line.slice(5).trim();
      if (payload) {
        try {
          console.log(JSON.parse(payload));
        } catch {
          console.log(payload);
        }
      }
    }
  }
}
