let userId = 1; // demo user for now

// Fetch user balance
async function fetchUser() {
  let res = await fetch(`/api/users/${userId}`);
  if (!res.ok) {
    console.error("Error fetching user:", res.statusText);
    return;
  }
  let user = await res.json();
  document.getElementById("cash").innerText = user.cash.toFixed(2);
  document.getElementById("btc").innerText = user.btc.toFixed(4);
}

// Buy BTC
async function buyBTC() {
  let amount = parseFloat(document.getElementById("amount").value);
  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid BTC amount");
    return;
  }

  await fetch(`/api/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, type: "buy", amount })
  });

  fetchUser();
}

// Sell BTC
async function sellBTC() {
  let amount = parseFloat(document.getElementById("amount").value);
  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid BTC amount");
    return;
  }

  await fetch(`/api/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, type: "sell", amount })
  });

  fetchUser();
}

// Setup BTC Price Chart
const ctx = document.getElementById('priceChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'BTC Price (USD)',
      data: [],
      borderColor: 'gold',
      borderWidth: 2,
      fill: false,
      tension: 0.1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { labels: { color: 'white' } }
    },
    scales: {
      x: { ticks: { color: 'white' } },
      y: { ticks: { color: 'white' } }
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

    // Keep last 10 prices
    if (chart.data.labels.length > 10) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.update();
  } catch (err) {
    console.error("Error fetching BTC price:", err);
  }
}

// Initialize
setInterval(fetchPrices, 5000);
fetchUser();
fetchPrices();
