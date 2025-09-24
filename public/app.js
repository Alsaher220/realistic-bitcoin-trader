let userId = 1; // Default demo user (Zaza)

// Fetch user balance from backend
async function fetchUser() {
  try {
    let res = await fetch(`/api/users/${userId}`);
    if (!res.ok) throw new Error("User not found");
    let user = await res.json();

    document.getElementById("cash").innerText = user.cash.toFixed(2);
    document.getElementById("btc").innerText = user.btc.toFixed(4);
  } catch (err) {
    console.error("⚠️ Error fetching user:", err);
  }
}

// Buy BTC
async function buyBTC() {
  let amount = parseFloat(document.getElementById("amount").value);
  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid BTC amount");
    return;
  }

  try {
    let res = await fetch(`/api/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type: "buy", amount })
    });

    let data = await res.json();
    if (!res.ok) {
      alert(data.error || "Trade failed");
      return;
    }

    fetchUser(); // refresh balance
  } catch (err) {
    console.error("⚠️ Buy error:", err);
  }
}

// Sell BTC
async function sellBTC() {
  let amount = parseFloat(document.getElementById("amount").value);
  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid BTC amount");
    return;
  }

  try {
    let res = await fetch(`/api/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type: "sell", amount })
    });

    let data = await res.json();
    if (!res.ok) {
      alert(data.error || "Trade failed");
      return;
    }

    fetchUser();
  } catch (err) {
    console.error("⚠️ Sell error:", err);
  }
}

// Setup BTC Price Chart
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
      legend: { labels: { color: "#fff" } }
    },
    scales: {
      x: { ticks: { color: "#fff" } },
      y: { ticks: { color: "#fff" } }
    }
  }
});

// Fetch live BTC price every 5 seconds
async function fetchPrices() {
  try {
    let res = await fetch("https://api.coindesk.com/v1/bpi/currentprice.json");
    let data = await res.json();
    let price = data.bpi.USD.rate_float;

    chart.data.labels.push(new Date().toLocaleTimeString());
    chart.data.datasets[0].data.push(price);

    // Keep only last 15 prices
    if (chart.data.labels.length > 15) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.update();
  } catch (err) {
    console.error("⚠️ Price fetch error:", err);
  }
}

// Initialize app
fetchUser();
fetchPrices();
setInterval(fetchPrices, 5000);
