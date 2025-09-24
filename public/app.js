// -------------------- CONFIG --------------------
const BASE_URL = "https://realistic-bitcoin-trader.onrender.com";
let userId = 1; // Default user (Zaza)

// -------------------- FETCH USER DATA --------------------
async function fetchUser() {
  try {
    let res = await fetch(`${BASE_URL}/api/users/${userId}`);
    if (!res.ok) {
      console.error("Error fetching user:", res.statusText);
      return;
    }
    let user = await res.json();
    document.getElementById("username").innerText = user.name;
    document.getElementById("cash").innerText = user.cash.toFixed(2);
    document.getElementById("btc").innerText = user.btc.toFixed(4);
  } catch (err) {
    console.error("Fetch user failed:", err);
  }
}

// -------------------- BUY BTC --------------------
async function buyBTC() {
  let amount = parseFloat(document.getElementById("amount").value);
  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid BTC amount");
    return;
  }

  let res = await fetch(`${BASE_URL}/api/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, type: "buy", amount })
  });

  if (!res.ok) {
    let err = await res.json();
    alert(err.error || "Trade failed");
    return;
  }

  await fetchUser();
  await fetchTrades();
}

// -------------------- SELL BTC --------------------
async function sellBTC() {
  let amount = parseFloat(document.getElementById("amount").value);
  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid BTC amount");
    return;
  }

  let res = await fetch(`${BASE_URL}/api/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, type: "sell", amount })
  });

  if (!res.ok) {
    let err = await res.json();
    alert(err.error || "Trade failed");
    return;
  }

  await fetchUser();
  await fetchTrades();
}

// -------------------- PRICE CHART --------------------
const ctx = document.getElementById("priceChart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "BTC Price (USD)",
      data: [],
      borderColor: "#f7931a",
      borderWidth: 2,
      fill: false,
      tension: 0.1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { labels: { color: "white" } }
    },
    scales: {
      x: { ticks: { color: "white" } },
      y: { ticks: { color: "white" } }
    }
  }
});

// -------------------- FETCH LIVE PRICE --------------------
async function fetchPrices() {
  try {
    let res = await fetch("https://api.coindesk.com/v1/bpi/currentprice.json");
    let data = await res.json();
    let price = data.bpi.USD.rate_float;

    chart.data.labels.push(new Date().toLocaleTimeString());
    chart.data.datasets[0].data.push(price);

    if (chart.data.labels.length > 10) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.update();
  } catch (err) {
    console.error("Error fetching BTC price:", err);
  }
}

// -------------------- FETCH TRADES --------------------
async function fetchTrades() {
  try {
    let res = await fetch(`${BASE_URL}/api/trades/${userId}`);
    if (!res.ok) {
      console.error("Error fetching trades:", res.statusText);
      return;
    }
    let trades = await res.json();

    let tableBody = document.getElementById("tradeHistory");
    tableBody.innerHTML = trades.map(t => `
      <tr>
        <td>${t.type.toUpperCase()}</td>
        <td>${t.amount}</td>
        <td>$${t.price}</td>
        <td>${new Date(t.date).toLocaleString()}</td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Error fetching trades:", err);
  }
}

// -------------------- INIT APP --------------------
setInterval(fetchPrices, 5000); // Update price every 5s
fetchUser();    // Load balance from server
fetchPrices();  // Load first price
fetchTrades();  // Load history
