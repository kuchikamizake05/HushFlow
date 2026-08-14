async function dumpHead() {
  const res = await fetch("http://localhost:3000");
  const html = await res.text();
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
  console.log("=== HEAD CONTENT ===");
  console.log(headMatch ? headMatch[1] : "No head found");
}

dumpHead().catch(console.error);
