let cash = 10000; // starting balance
let btc = 0;
let price = 20000; // starting price
const priceHistory = [price];

const cashEl = document.getElementById("cash");
const btcEl = document.getElementById("btc");
const amountEl = document.getElementById("amount");

cashEl.textContent = cash.toFixed(2);
btcEl.textContent = btc;

function updateUI() {
  cashEl.textContent = cash.toFixed(2);
  btcEl.textContent = btc.toFixed(4);
  chart.update();
}

function buyBTC() {
  const amount = parseFloat(amountEl.value);
  if (amount * price <= cash) {
    cash -= amount * price;
    btc += amount;
    updateUI();
  } else {
    alert("Not enough cash!");
  }
}

function sellBTC() {
  const amount = parseFloat(amountEl.value);
  if (amount <= btc) {
    cash += amount * price;
    btc -= amount;
    updateUI();
  } else {
    alert("Not enough BTC!");
  }
}

// Chart.js for price graph
const ctx = document.getElementById("priceChart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [0],
    datasets: [{
      label: "BTC Price (USD)",
      data: priceHistory,
      borderColor: "#f7931a",
      borderWidth: 2,
      fill: false
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: false }
    }
  }
});

// Simulate price changes
setInterval(() => {
  const change = (Math.random() - 0.5) * 500;
  price += change;
  price = Math.max(price, 1000);
  priceHistory.push(price);
  chart.data.labels.push(priceHistory.length - 1);
  chart.update();
}, 2000);
