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

// ==========================
// Fetch User Data
// ==========================
async function fetchUserData() {
  try {
    const res = await fetch(`/user/${userId}`);
    const data = await res.json();

    if (!data.success) return;

    const user = data.user;

    // Display preferred name if available, otherwise username
    usernameSpan.textContent = user.preferred_name || user.preferredName || user.username || 'Unknown';

    // Cash with fallback
    let cash = parseFloat(user.cash);
    if (isNaN(cash) || cash === null) cash = START_CASH;
    cashSpan.textContent = cash.toFixed(2);

    // BTC
    let btc = parseFloat(user.btc);
    if (isNaN(btc) || btc === null) btc = 0;
    btcSpan.textContent = btc.toFixed(6);

    // Withdrawals & Investments
    renderWithdrawals(data.withdrawals || []);
    renderInvestments(data.investments || []);
  } catch (err) {
    console.error('Error fetching user data:', err);
  }
}

// ==========================
// Render Withdrawals
// ==========================
function renderWithdrawals(withdrawals = []) {
  withdrawalsTable.innerHTML = '';
  if (withdrawals.length === 0) {
    withdrawalsTable.innerHTML = `<tr><td colspan="4" style="text-align:center;">No withdrawals yet</td></tr>`;
    return;
  }

  withdrawals.forEach(w => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${parseFloat(w.amount || 0).toFixed(2)}</td>
      <td>${w.wallet || '-'}</td>
      <td>${w.status || 'Pending'}</td>
      <td>${new Date(w.date || Date.now()).toLocaleString()}</td>
    `;
    withdrawalsTable.appendChild(row);
  });
}

// ==========================
// Render Investments
// ==========================
function renderInvestments(investments = []) {
  investmentsTable.innerHTML = '';
  if (investments.length === 0) {
    investmentsTable.innerHTML = `<tr><td colspan="4" style="text-align:center;">No investments yet</td></tr>`;
    return;
  }

  investments.forEach(inv => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${inv.plan || '-'}</td>
      <td>${parseFloat(inv.amount || 0).toFixed(2)}</td>
      <td>${inv.status || 'Pending'}</td>
      <td>${new Date(inv.created_at || Date.now()).toLocaleString()}</td>
    `;
    investmentsTable.appendChild(row);
  });
}

// ==========================
// Show Alerts
// ==========================
function showAlert(el, msg, isSuccess = true) {
  el.textContent = msg;
  el.className = `alert ${isSuccess ? 'success' : 'error'}`;
  el.style.display = 'block';
  setTimeout(() => (el.style.display = 'none'), 3000);
}

// ==========================
// Buy BTC
// ==========================
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

// ==========================
// Sell BTC
// ==========================
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

// ==========================
// Withdraw
// ==========================
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

// ==========================
// Initial fetch + auto-refresh
// ==========================
fetchUserData();
setInterval(fetchUserData, 5000);

// ==========================
// Logout
// ==========================
function logout() {
  localStorage.removeItem('userId');
  window.location.href = 'index.html';
}
document.getElementById('logoutBtn')?.addEventListener('click', logout);
