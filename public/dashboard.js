// dashboard.js

const userId = localStorage.getItem('userId'); // Set on login
const usernameSpan = document.getElementById('username');
const cashSpan = document.getElementById('cash');
const btcSpan = document.getElementById('btc');
const withdrawalsTable = document.querySelector('#withdrawalsTable tbody');

async function fetchUserData() {
  try {
    const res = await fetch(`/user/${userId}`);
    const data = await res.json();
    if (data.success) {
      usernameSpan.textContent = data.user.username;
      cashSpan.textContent = parseFloat(data.user.cash).toFixed(2);
      btcSpan.textContent = parseFloat(data.user.btc).toFixed(6);
      loadWithdrawals();
    }
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
}

async function loadWithdrawals() {
  try {
    const res = await fetch(`/user/${userId}/withdrawals`);
    const data = await res.json();
    withdrawalsTable.innerHTML = '';
    if (data.success) {
      data.withdrawals.forEach(w => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${parseFloat(w.amount).toFixed(2)}</td>
          <td>${w.wallet}</td>
          <td>${w.status}</td>
          <td>${new Date(w.date).toLocaleString()}</td>
        `;
        withdrawalsTable.appendChild(row);
      });
    }
  } catch (err) {
    console.error("Error loading withdrawals:", err);
  }
}

// Buy BTC
document.getElementById('buyForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('buyAmount').value);
  const price = parseFloat(document.getElementById('buyPrice').value);

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
    console.error("Buy error:", err);
  }
});

// Sell BTC
document.getElementById('sellForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('sellAmount').value);
  const price = parseFloat(document.getElementById('sellPrice').value);

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
    console.error("Sell error:", err);
  }
});

// Withdraw
document.getElementById('withdrawForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('withdrawAmount').value);
  const wallet = document.getElementById('withdrawWallet').value;

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
    console.error("Withdraw error:", err);
  }
});

fetchUserData();
