// =========================
// TradeSphere Dashboard JS
// =========================

const userId = localStorage.getItem('userId');
if (!userId) window.location.href = 'index.html';

const usernameSpan = document.getElementById('username');
const cashSpan = document.getElementById('cash');
const btcSpan = document.getElementById('btc');
const withdrawalsTable = document.querySelector('#withdrawalsTable tbody');
const investmentsTable = document.querySelector('#investmentsTable tbody');
const buyAlert = document.getElementById('buyAlert');
const sellAlert = document.getElementById('sellAlert');
const withdrawAlert = document.getElementById('withdrawAlert');

const START_CASH = 50;

// Fetch user portfolio and render dashboard
async function fetchUserData() {
  try {
    const res = await fetch(`/user/${userId}`);
    const data = await res.json();

    if (data.success) {
      const user = data.user;

      // Username
      usernameSpan.textContent = user.username;

      // Cash
      let cash = parseFloat(user.cash);
      if (isNaN(cash)) cash = START_CASH;
      cashSpan.textContent = cash.toFixed(2);

      // BTC
      btcSpan.textContent = parseFloat(user.btc || 0).toFixed(6);

      // Withdrawals & Investments
      renderWithdrawals(data.withdrawals || []);
      renderInvestments(data.investments || []);
    }
  } catch (err) {
    console.error("Error fetching portfolio:", err);
  }
}

function renderWithdrawals(withdrawals = []) {
  withdrawalsTable.innerHTML = '';
  if (withdrawals.length > 0) {
    withdrawals.forEach(w => {
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
}

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
}

// Initial fetch + auto-refresh
fetchUserData();
setInterval(fetchUserData, 5000);

// Logout
function logout() {
  localStorage.removeItem('userId');
  window.location.href = 'index.html';
}
