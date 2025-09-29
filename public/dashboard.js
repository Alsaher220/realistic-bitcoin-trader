// =========================
// TradeSphere Dashboard JS
// =========================

// Redirect if no userId is saved (user not logged in)
const userId = localStorage.getItem('userId');
if (!userId) window.location.href = 'index.html';

// DOM elements
const usernameSpan = document.getElementById('username');
const cashSpan = document.getElementById('cash');
const btcSpan = document.getElementById('btc');
const withdrawalsTable = document.querySelector('#withdrawalsTable tbody');
const investmentsTable = document.querySelector('#investmentsTable tbody');
const buyAlert = document.getElementById('buyAlert');
const sellAlert = document.getElementById('sellAlert');
const withdrawAlert = document.getElementById('withdrawAlert');

// Default starting cash
const START_CASH = 50;

// Fetch user data and render dashboard
async function fetchUserData() {
  try {
    const res = await fetch(`/user/${userId}`);
    const data = await res.json();

    if (data.success) {
      const user = data.user;

      // Show username as entered at registration
      usernameSpan.textContent = user.username;

      // Ensure cash shows at least $50
      let cash = parseFloat(user.cash);
      if (isNaN(cash)) cash = START_CASH;
      cashSpan.textContent = cash.toFixed(2);

      // BTC
      btcSpan.textContent = parseFloat(user.btc || 0).toFixed(6);

      // Load withdrawals & investments
      await fetchWithdrawals();
      await fetchInvestments();
    }
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
}

// Fetch and render withdrawals table
async function fetchWithdrawals() {
  try {
    const res = await fetch(`/user/${userId}/withdrawals`);
    const data = await res.json();
    withdrawalsTable.innerHTML = '';

    if (data.success && data.withdrawals.length) {
      data.withdrawals.forEach(w => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${parseFloat(w.amount).toFixed(2)}</td>
          <td>${w.wallet || '-'}</td>
          <td>${w.status || 'Pending'}</td>
          <td>${new Date(w.date || Date.now()).toLocaleString()}</td>
        `;
        withdrawalsTable.appendChild(row);
      });
    } else {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4" style="text-align:center;">No withdrawals yet</td>`;
      withdrawalsTable.appendChild(row);
    }
  } catch (err) {
    console.error("Error fetching withdrawals:", err);
  }
}

// Fetch and render investments table
async function fetchInvestments() {
  try {
    const res = await fetch(`/user/${userId}/investments`);
    const data = await res.json();
    investmentsTable.innerHTML = '';

    if (data.success && data.investments.length) {
      data.investments.forEach(inv => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${inv.plan}</td>
          <td>${parseFloat(inv.amount).toFixed(2)}</td>
          <td>${inv.status || 'Pending'}</td>
          <td>${new Date(inv.created_at || Date.now()).toLocaleString()}</td>
        `;
        investmentsTable.appendChild(row);
      });
    } else {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4" style="text-align:center;">No investments yet</td>`;
      investmentsTable.appendChild(row);
    }
  } catch (err) {
    console.error("Error fetching investments:", err);
  }
}

// Show alert helper
function showAlert(el, msg, isSuccess = true) {
  el.textContent = msg;
  el.className = `alert ${isSuccess ? 'success' : 'error'}`;
  el.style.display = 'block';
  setTimeout(() => (el.style.display = 'none'), 3000);
}

// Buy BTC
document.getElementById('buyForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('buyAmount').value);
  const price = parseFloat(document.getElementById('buyPrice').value);

  try {
    const res = await fetch('/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount, price })
    });
    const data = await res.json();
    showAlert(buyAlert, data.message || 'BTC purchased!', data.success);
    fetchUserData();
    e.target.reset();
  } catch (err) {
    showAlert(buyAlert, 'Error purchasing BTC', false);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount, price })
    });
    const data = await res.json();
    showAlert(sellAlert, data.message || 'BTC sold!', data.success);
    fetchUserData();
    e.target.reset();
  } catch (err) {
    showAlert(sellAlert, 'Error selling BTC', false);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount, wallet })
    });
    const data = await res.json();
    showAlert(withdrawAlert, data.message, data.success);
    fetchUserData();
    e.target.reset();
  } catch (err) {
    showAlert(withdrawAlert, 'Error requesting withdrawal', false);
  }
});

// Initial fetch + auto-refresh
fetchUserData();
setInterval(fetchUserData, 5000);

// Logout
function logout() {
  localStorage.removeItem('userId');
  window.location.href = 'index.html';
}
