// dashboard.js - TradeSphere User Dashboard
const userId = localStorage.getItem('userId'); // Set on login
const usernameSpan = document.getElementById('username');
const cashSpan = document.getElementById('cash');
const btcSpan = document.getElementById('btc');
const withdrawalsTable = document.querySelector('#withdrawalsTable tbody');

// Fetch user data
async function fetchUserData() {
  try {
    const res = await fetch(`/user/${userId}`);
    const data = await res.json();
    if (data.success) {
      usernameSpan.textContent = data.user.username;
      cashSpan.textContent = parseFloat(data.user.cash).toFixed(2);
      btcSpan.textContent = parseFloat(data.user.btc).toFixed(4);
      loadWithdrawals();
    }
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
}

// Load withdrawal history
async function loadWithdrawals() {
  try {
    const res = await fetch(`/user/${userId}/withdrawals`);
    const data = await res.json();
    withdrawalsTable.innerHTML = '';
    if (data.success && data.withdrawals.length) {
      data.withdrawals.forEach(w => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${parseFloat(w.amount).toFixed(2)}</td>
                         <td>${w.wallet}</td>
                         <td>${w.status}</td>
                         <td>${new Date(w.date).toLocaleString()}</td>`;
        withdrawalsTable.appendChild(row);
      });
    }
  } catch (err) {
    console.error("Error loading withdrawals:", err);
  }
}

// ================= BUY BTC =================
document.getElementById('buyForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('buyAmount').value);
  const price = parseFloat(document.getElementById('buyPrice').value);
  if (!amount || !price || amount <= 0 || price <= 0) {
    alert("Enter valid amount and price");
    return;
  }

  try {
    const res = await fetch('/buy', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, amount, price})
    });
    const data = await res.json();
    alert(data.message || 'BTC purchased!');
    fetchUserData();
  } catch (err) {
    console.error("Error buying BTC:", err);
  }
});

// ================= SELL BTC =================
document.getElementById('sellForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('sellAmount').value);
  const price = parseFloat(document.getElementById('sellPrice').value);
  if (!amount || !price || amount <= 0 || price <= 0) {
    alert("Enter valid amount and price");
    return;
  }

  try {
    const res = await fetch('/sell', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, amount, price})
    });
    const data = await res.json();
    alert(data.message || 'BTC sold!');
    fetchUserData();
  } catch (err) {
    console.error("Error selling BTC:", err);
  }
});

// ================= WITHDRAW BTC =================
document.getElementById('withdrawForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('withdrawAmount').value);
  const wallet = document.getElementById('withdrawWallet').value;
  if (!amount || amount <= 0 || !wallet) {
    alert("Enter valid amount and wallet address");
    return;
  }

  try {
    const res = await fetch('/withdraw', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, amount, wallet})
    });
    const data = await res.json();
    alert(data.message);
    fetchUserData();
  } catch (err) {
    console.error("Error requesting withdrawal:", err);
  }
});

// Fetch data on page load
fetchUserData();
