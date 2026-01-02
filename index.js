import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();
  next();
});
app.post("/challenge", async (req, res) => {
  try {
    const { address } = req.body;

    const r = await fetch(
      `https://api.polymarket.com/clob-auth/challenge?address=${address}`
    );

    const j = await r.json();
    res.status(r.status).json(j);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/order", async (req, res) => {
  try {
    const { address, signature, token, amount } = req.body;

    if (!address || !signature || !token || !amount) {
      return res.status(400).json({ error: "missing_params" });
    }

    const authRes = await fetch(
      "https://api.polymarket.com/clob-auth/auth",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature })
      }
    );

    const authJson = await authRes.json();
    if (!authRes.ok || !authJson.token) {
      return res.status(401).json({ error: "auth_failed", detail: authJson });
    }

    const jwt = authJson.token;

    const order = { side: "buy", token, amount, price: null };

    const relRes = await fetch("https://clob.polymarket.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`
      },
      body: JSON.stringify(order)
    });

    const text = await relRes.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(relRes.status).send(text);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Proxy running");
});