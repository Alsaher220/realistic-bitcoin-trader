/* =========================
   TradeSphere Dashboard JS
============================*/

// Redirect if no userId is saved (user not logged in)
const userId = localStorage.getItem('userId');
if (!userId) {
  window.location.href = 'index.html';
}

// DOM elements
const usernameSpan = document.getElementById('username');
const cashSpan = document.getElementById('cash');
const btcSpan = document.getElementById('btc');
const withdrawalsTable = document.querySelector('#withdrawalsTable tbody');
const investmentsTable = document.querySelector('#investmentsTable tbody');

// Alert elements
const buyAlert = document.getElementById('buyAlert');
const sellAlert = document.getElementById('sellAlert');
const withdrawAlert = document.getElementById('withdrawAlert');

// Default values
const DEFAULT_CASH = 50;
const DEFAULT_USERNAME = 'User';

// Fetch user portfolio and render everything
async function fetchUserData() {
  try {
    const res = await fetch(`/user/${userId}/portfolio`);
    const data = await res.json();

    if (data.success) {
      let user = data.portfolio.user;

      // Set username
      if (!user.username) {
        user.username = DEFAULT_USERNAME;
        await updateUsername(DEFAULT_USERNAME); // persist default username
      }
      usernameSpan.textContent = user.username;

      // Set cash and persist default if empty
      let cash = parseFloat(user.cash);
      if (isNaN(cash) || cash <= 0) {
        cash = DEFAULT_CASH;
        await updateCash(DEFAULT_CASH); // persist default cash
      }
      cashSpan.textContent = cash.toFixed(2);

      // Set BTC
      btcSpan.textContent = parseFloat(user.btc || 0).toFixed(6);

      // Render withdrawals & investments
      renderWithdrawals(data.portfolio.withdrawals || []);
      renderInvestments(data.portfolio.investments || []);
    }
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
}

// Persist default username to backend
async function updateUsername(username) {
  try {
    await fetch('/user/update-username', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, username})
    });
  } catch (err) {
    console.error("Error updating username:", err);
  }
}

// Persist default cash to backend
async function updateCash(cash) {
  try {
    await fetch('/user/update-cash', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, cash})
    });
  } catch (err) {
    console.error("Error updating cash:", err);
  }
}

// Render withdrawals table
function renderWithdrawals(withdrawals = []) {
  withdrawalsTable.innerHTML = '';

  if (withdrawals.length > 0) {
    withdrawals.forEach(w => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${parseFloat(w.amount).toFixed(2)}</td>
        <td>${w.wallet || '-'}</td>
        <td>${w.status || 'Pending'}</td>
        <td>${new Date(w.date || w.created_at || Date.now()).toLocaleString()}</td>
      `;
      withdrawalsTable.appendChild(row);
    });
  } else {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4" style="text-align:center;">No withdrawals yet</td>`;
    withdrawalsTable.appendChild(row);
  }
}

// Render investments table
function renderInvestments(investments = []) {
  investmentsTable.innerHTML = '';

  if (investments.length > 0) {
    investments.forEach(inv => {
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
}

// Show alert helper
function showAlert(element, message, isSuccess = true) {
  element.textContent = message;
  element.className = `alert ${isSuccess ? 'success' : 'error'}`;
  element.style.display = 'block';
  setTimeout(() => { element.style.display = 'none'; }, 3000);
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
    showAlert(buyAlert, data.message || 'BTC purchased!', data.success);
    fetchUserData();
    e.target.reset();
  } catch (err) {
    console.error("Buy error:", err);
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
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, amount, price})
    });
    const data = await res.json();
    showAlert(sellAlert, data.message || 'BTC sold!', data.success);
    fetchUserData();
    e.target.reset();
  } catch (err) {
    console.error("Sell error:", err);
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
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, amount, wallet})
    });
    const data = await res.json();
    showAlert(withdrawAlert, data.message, data.success);
    fetchUserData();
    e.target.reset();
  } catch (err) {
    console.error("Withdraw error:", err);
    showAlert(withdrawAlert, 'Error requesting withdrawal', false);
  }
});

// Admin-only: Top up cash
async function topUpCash(amount) {
  try {
    const res = await fetch('/topup/cash', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, amount})
    });
    const data = await res.json();
    showAlert(buyAlert, data.message || `Cash topped up $${amount}`, data.success);
    fetchUserData();
  } catch (err) {
    console.error("Top-up error:", err);
    showAlert(buyAlert, 'Error topping up cash', false);
  }
}

// Admin-only: Top up investment
async function topUpInvestment(amount, plan) {
  try {
    const res = await fetch('/topup/investment', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, amount, plan})
    });
    const data = await res.json();
    showAlert(buyAlert, data.message || `Investment topped up $${amount}`, data.success);
    fetchUserData();
  } catch (err) {
    console.error("Top-up investment error:", err);
    showAlert(buyAlert, 'Error topping up investment', false);
  }
}

// Initial fetch
fetchUserData();

// Auto-refresh every 5 seconds
setInterval(fetchUserData, 5000);

// Logout
function logout() {
  localStorage.removeItem('userId');
  window.location.href = 'index.html';
}
