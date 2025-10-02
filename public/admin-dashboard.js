// ==========================
// TradeSphere Admin Dashboard JS (Full & Fixed Top-Up + Support + Info + Reduce)
// ==========================

const usersTableBody = document.querySelector('#usersTable tbody');
const tradesTableBody = document.querySelector('#tradesTable tbody');
const withdrawalsTableBody = document.querySelector('#withdrawalsTable tbody');
const investmentsTableBody = document.querySelector('#investmentsTable tbody');
const topupTableBody = document.querySelector('#topupTable tbody');
const supportTableBody = document.querySelector('#supportTable tbody');

const userAlert = document.getElementById('userAlert');
const withdrawalAlert = document.getElementById('withdrawalAlert');
const investmentAlert = document.getElementById('investmentAlert');

const adminId = localStorage.getItem('userId');
const adminRole = localStorage.getItem('role');

// Redirect if not admin
if (!adminId || adminRole !== 'admin') {
  alert('Access denied! Admin login required.');
  window.location.href = 'admin.html';
}

// ==========================
// Show Alert Function
// ==========================
function showAlert(element, message, isSuccess = true) {
  if (!element) return;
  element.textContent = message;
  element.className = `alert ${isSuccess ? 'success' : 'error'}`;
  element.style.display = 'block';
  setTimeout(() => { element.style.display = 'none'; }, 3000);
}

// ==========================
// Fetch Users
// ==========================
async function fetchUsers() {
  try {
    const res = await fetch('/admin/users', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    usersTableBody.innerHTML = '';

    if (data.success && Array.isArray(data.users) && data.users.length) {
      data.users.forEach(user => {
        const username = user.username || 'Unknown';
        const cash = Number(user.cash || 0).toFixed(2);
        const btc = Number(user.btc || 0).toFixed(6);
        const userId = user.id || user._id || user.userId;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${username}</td>
          <td>$${cash}</td>
          <td>${btc}</td>
          <td><button onclick="topUpUser('${userId}')">Top Up</button></td>
          <td><button onclick="reduceUser('${userId}')">Reduce</button></td>
        `;
        usersTableBody.appendChild(row);
      });
    } else {
      usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No users found</td></tr>`;
    }
  } catch (err) {
    showAlert(userAlert, 'Error fetching users', false);
    console.error(err);
  }
}

// ==========================
// Top Up User
// ==========================
async function topUpUser(userId) {
  const cash = prompt("Enter CASH amount to top up:");
  const btc = prompt("Enter BTC amount to top up:");
  const investAmt = prompt("Enter INVESTMENT amount:");
  let investPlan = investAmt ? prompt("Enter Investment Plan name:") || "Custom Plan" : null;

  if (!cash && !btc && !investAmt) return;

  try {
    const res = await fetch('/admin/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({
        userId,
        cash: cash ? Number(cash) : 0,
        btc: btc ? Number(btc) : 0,
        investmentAmount: investAmt ? Number(investAmt) : 0,
        investmentPlan: investPlan
      })
    });
    const data = await res.json();
    if (data.success) {
      showAlert(userAlert, data.message || 'Top-up successful', true);
      fetchUsers();
      fetchInvestments();
      fetchTopups();
    } else {
      showAlert(userAlert, data.message || 'Top-up failed', false);
    }
  } catch (err) {
    showAlert(userAlert, 'Top-up failed', false);
    console.error(err);
  }
}

// ==========================
// Reduce User Balance
// ==========================
async function reduceUser(userId) {
  const cash = prompt("Enter CASH amount to reduce:");
  const btc = prompt("Enter BTC amount to reduce:");

  if (!cash && !btc) return;

  try {
    const res = await fetch('/admin/reduce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({
        userId,
        cash: cash ? Number(cash) : 0,
        btc: btc ? Number(btc) : 0
      })
    });
    const data = await res.json();
    if (data.success) {
      showAlert(userAlert, data.message || 'Reduction successful', true);
      fetchUsers();
    } else {
      showAlert(userAlert, data.message || 'Reduction failed', false);
    }
  } catch (err) {
    showAlert(userAlert, 'Reduction failed', false);
    console.error(err);
  }
}

// ==========================
// Fetch Trades
// ==========================
async function fetchTrades() {
  try {
    const res = await fetch('/admin/trades', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    tradesTableBody.innerHTML = '';

    if (data.success && Array.isArray(data.trades) && data.trades.length) {
      data.trades.forEach(trade => {
        const username = trade.username || 'Unknown';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${username}</td>
          <td>${new Date(trade.date).toLocaleString()}</td>
          <td>${trade.type}</td>
          <td>${Number(trade.amount).toFixed(6)}</td>
          <td>${Number(trade.price).toFixed(2)}</td>
        `;
        tradesTableBody.appendChild(row);
      });
    } else {
      tradesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No trades found</td></tr>`;
    }
  } catch (err) {
    console.error(err);
  }
}

// ==========================
// Fetch Withdrawals
// ==========================
// (unchanged, same as yours)
// ==========================

// ==========================
// Fetch Investments
// ==========================
// (unchanged, same as yours)
// ==========================

// ==========================
// Fetch Top-Ups
// ==========================
// (unchanged, same as yours)
// ==========================

// ==========================
// Support Messages
// ==========================
// (unchanged, same as yours)
// ==========================

// ==========================
// Refresh All
// ==========================
function refreshAll() {
  fetchUsers();
  fetchTrades();
  fetchWithdrawals();
  fetchInvestments();
  fetchTopups();
  fetchSupportMessages();
}

// Initial fetch + auto-refresh every 5s
refreshAll();
setInterval(refreshAll, 5000);

// ==========================
// Logout
// ==========================
document.getElementById('adminLogout').addEventListener('click', () => {
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
  window.location.href = 'admin.html';
});
