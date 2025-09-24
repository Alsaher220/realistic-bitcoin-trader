const BASE_URL = "";
let userId = null;

// ---- LOGIN ----
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  let res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  let data = await res.json();
  userId = data.id;
  document.getElementById("usernameDisplay").innerText = data.name;
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "block";
  fetchUser();
  fetchTrades();
}

// ---- FETCH USER ----
async function fetchUser() {
  let res = await fetch(`${BASE_URL}/api/users/${userId}`);
  let user = await res.json();
  document.getElementById("cash").innerText = user.cash.toFixed(2);
  document.getElementById("btc").innerText = user.btc.toFixed(4);
}

// ---- BUY ----
async function buyBTC() {
  let amount = parseFloat(document.getElementById("amount").value);
  let price = await fetchPrice();
  let res = await fetch(`${BASE_URL}/api/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, type: "buy", amount, price })
  });
  if (!res.ok) return alert("Trade failed");
  await fetchUser();
  await fetchTrades();
}

// ---- SELL ----
async function sellBTC() {
  let amount = parseFloat(document.getElementById("amount").value);
  let price = await fetchPrice();
  let res = await fetch(`${BASE_URL}/api/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, type: "sell", amount, price })
  });
  if (!res.ok) return alert("Trade failed");
  await fetchUser();
  await fetchTrades();
}

// ---- PRICE CHART ----
const ctx = document.getElementById("priceChart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: { labels: [], datasets: [{ label: "BTC Price", data: [], borderColor: "#f7931a", fill: false }] },
  options: { scales: { x: { ticks: { color: "white" } }, y: { ticks: { color: "white" } } } }
});

async function fetchPrice() {
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
  return price;
}
setInterval(fetchPrice, 5000);
fetchPrice();

// ---- TRADES ----
async function fetchTrades() {
  let res = await fetch(`${BASE_URL}/api/users/${userId}`);
  let user = await res.json();
  let table = document.getElementById("tradeHistory");
  table.innerHTML = user.trades.map(t => `
    <tr>
      <td>${t.type.toUpperCase()}</td>
      <td>${t.amount}</td>
      <td>$${t.price}</td>
      <td>${new Date(t.date).toLocaleString()}</td>
    </tr>
  `).join("");
}
