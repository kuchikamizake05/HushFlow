async function check() {
  const res = await fetch("http://localhost:3000");
  const html = await res.text();
  console.log("HTML length:", html.length);
  const match = html.match(/href="(\/_next\/static\/css\/[^"]+)"/);
  if (match) {
    console.log("Found CSS link:", match[1]);
    const cssRes = await fetch("http://localhost:3000" + match[1]);
    const cssText = await cssRes.text();
    console.log("CSS file size:", cssText.length);
    console.log("Contains .hero-heading:", cssText.includes(".hero-heading"));
    console.log("Contains .sim-container:", cssText.includes(".sim-container"));
    console.log("Contains .btn-primary:", cssText.includes(".btn-primary"));
  } else {
    console.log("No CSS link found!");
  }
}

check().catch(console.error);
