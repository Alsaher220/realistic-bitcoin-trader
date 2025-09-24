// script.js
const BASE_URL = ""; // same origin (Render). If frontend hosted elsewhere, set to "https://realistic-bitcoin-trader.onrender.com"

let currentUserId = null;
let latestPrice = 30000;

// UI elements
const loginPanel = document.getElementById("loginPanel");
const appPanel = document.getElementById("appPanel");
const usernameDisplay = document.getElementById("usernameDisplay");
const cashDisplay = document.getElementById("cashDisplay");
const btcDisplay = document.getElementById("btcDisplay");
const amountInput = document.getElementById("amountInput");
const tradeHistoryBody = document.getElementById("tradeHistory");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const btnBuy = document.getElementById("btnBuy");
const btnSell = document.getElementById("btnSell");
const loginName = document.getElementById("loginName");
const loginPass = document.getElementById("loginPass");

// Chart setup
const ctx = document.getElementById("priceChart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: { labels: [], datasets: [{ label: "BTC Price (USD)", data: [], borderColor: "#f7931a", borderWidth: 2, fill:false }] },
  options: {
    responsive: true,
    plugins: { legend: { labels: { color: "#fff" } } },
    scales: {
      x: { ticks: { color: "#fff" } },
      y: { ticks: { color: "#fff" } }
    }
  }
});

// ========== HELPERS ==========
function showLogin() {
  loginPanel.style.display = "block";
  appPanel.style.display = "none";
}
function showApp() {
  loginPanel.style.display = "none";
  appPanel.style.display = "block";
}
function formatUSD(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatBTC(n) {
  return Number(n).toFixed(8);
}
function setLoadingButton(btn, on) {
  btn.disabled = on;
  btn.style.opacity = on ? "0.6" : "1";
}

// ========== AUTH ==========
async function login() {
  const username = loginName.value.trim();
  const password = loginPass.value; // demo only, not used
  if (!username) return alert("Enter a username");

  setLoadingButton(btnLogin, true);
  try {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({ error: "Login failed" }));
      alert(err.error || "Login failed");
      setLoadingButton(btnLogin, false);
      return;
    }
    const user = await res.json();
    currentUserId = user.id;
    usernameDisplay.innerText = user.username;
    await refreshUser();
    showApp();
  } catch (e) {
    console.error(e);
    alert("Login error");
  } finally {
    setLoadingButton(btnLogin, false);
  }
}
btnLogin.addEventListener("click", login);

btnLogout.addEventListener("click", () => {
  currentUserId = null;
  loginName.value = "";
  loginPass.value = "";
  showLogin();
});

// ========== PRICE ==========
async function updatePrice() {
  try {
    const res = await fetch("https://api.coindesk.com/v1/bpi/currentprice.json");
    const j = await res.json();
    latestPrice = j.bpi.USD.rate_float || latestPrice;
  } catch (e) {
    // keep last price on error
    console.warn("Price fetch failed:", e);
  }
  // push to chart
  chart.data.labels.push(new Date().toLocaleTimeString());
  chart.data.datasets[0].data.push(latestPrice);
  if (chart.data.labels.length > 30) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update();
}
setInterval(updatePrice, 5000);
updatePrice(); // initial

// ========== USER / TRADES ==========
async function refreshUser() {
  if (!currentUserId) return;
  try {
    const res = await fetch(`${BASE_URL}/api/users/${currentUserId}`);
    if (!res.ok) return showLogin();
    const user = await res.json();
    cashDisplay.innerText = `$${formatUSD(user.cash)}`;
    btcDisplay.innerText = formatBTC(user.btc);
    usernameDisplay.innerText = user.username;
    renderTrades(user.trades || []);
  } catch (e) {
    console.error("refreshUser error", e);
  }
}

function renderTrades(trades) {
  if (!Array.isArray(trades) || trades.length === 0) {
    tradeHistoryBody.innerHTML = `<tr><td colspan="4" style="color:#9aa0a6">No trades yet</td></tr>`;
    return;
  }
  tradeHistoryBody.innerHTML = trades.map(t => `
    <tr>
      <td>${t.type.toUpperCase()}</td>
      <td>${t.amount}</td>
      <td>$${formatUSD(t.price)}</td>
      <td>${new Date(t.date).toLocaleString()}</td>
    </tr>
  `).join("");
}

// ========== TRADE ACTIONS ==========
async function doTrade(type) {
  if (!currentUserId) return alert("Login first");
  const amount = Number(amountInput.value);
  if (!amount || isNaN(amount) || amount <= 0) return alert("Enter a valid BTC amount");

  const btn = (type === "buy") ? btnBuy : btnSell;
  setLoadingButton(btn, true);

  // ensure we have latest price
  await updatePrice();

  try {
    const res = await fetch(`${BASE_URL}/api/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, type, amount, price: latestPrice })
    });
    const body = await res.json();
    if (!res.ok) {
      alert(body.error || "Trade failed");
      return;
    }
    // success: refresh user & history
    await refreshUser();
    amountInput.value = "";
  } catch (e) {
    console.error("Trade error", e);
    alert("Trade error");
  } finally {
    setLoadingButton(btn, false);
  }
}

btnBuy.addEventListener("click", () => doTrade("buy"));
btnSell.addEventListener("click", () => doTrade("sell"));

// ========== INIT ==========
showLogin();
