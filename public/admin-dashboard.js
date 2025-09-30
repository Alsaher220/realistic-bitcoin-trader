// ==========================
// TradeSphere Admin Dashboard JS (Full & Updated)
// ==========================

const usersTableBody = document.querySelector('#usersTable tbody');
const tradesTableBody = document.querySelector('#tradesTable tbody');
const withdrawalsTableBody = document.querySelector('#withdrawalsTable tbody');
const investmentsTableBody = document.querySelector('#investmentsTable tbody');
const topupTableBody = document.querySelector('#topupTable tbody');

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
  element.textContent = message;
  element.className = `alert ${isSuccess ? 'success' : 'error'}`;
  element.style.display = 'block';
  setTimeout(() => { element.style.display = 'none'; }, 3000);
}

// ==========================
// Track last top-up ID
// ==========================
let lastTopupId = 0;

// ==========================
// Fetch Users (show actual username)
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
        `;
        usersTableBody.appendChild(row);
      });
    } else {
      usersTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No users found</td></tr>`;
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
    showAlert(userAlert, data.message || 'Top-up successful', data.success);
    fetchUsers();
    fetchInvestments();
    fetchTopups();
  } catch (err) {
    showAlert(userAlert, 'Top-up failed', false);
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
async function fetchWithdrawals() {
  try {
    const res = await fetch('/admin/withdrawals', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    withdrawalsTableBody.innerHTML = '';

    if (data.success && Array.isArray(data.withdrawals) && data.withdrawals.length) {
      data.withdrawals.forEach(w => {
        const username = w.username || 'Unknown';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${username}</td>
          <td>${new Date(w.date).toLocaleString()}</td>
          <td>${Number(w.amount).toFixed(2)}</td>
          <td>${w.wallet || '-'}</td>
          <td>${w.status}</td>
          <td>${w.status === 'pending' ? `<button onclick="approveWithdrawal('${w.id || w._id}')">Approve</button>` : '-'}</td>
        `;
        withdrawalsTableBody.appendChild(row);
      });
    } else {
      withdrawalsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No withdrawals</td></tr>`;
    }
  } catch (err) {
    showAlert(withdrawalAlert, 'Error fetching withdrawals', false);
    console.error(err);
  }
}

// ==========================
// Approve Withdrawal
// ==========================
async function approveWithdrawal(withdrawalId) {
  try {
    const res = await fetch('/admin/withdrawals/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ withdrawalId })
    });
    const data = await res.json();
    showAlert(withdrawalAlert, data.message || 'Processed', data.success);
    fetchWithdrawals();
  } catch (err) {
    showAlert(withdrawalAlert, 'Approval failed', false);
    console.error(err);
  }
}

// ==========================
// Fetch Investments
// ==========================
async function fetchInvestments() {
  try {
    const res = await fetch('/admin/investments', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    investmentsTableBody.innerHTML = '';

    if (data.success && Array.isArray(data.investments) && data.investments.length) {
      data.investments.forEach(inv => {
        const username = inv.username || 'Unknown';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${username}</td>
          <td>$${Number(inv.amount).toFixed(2)}</td>
          <td>${inv.plan}</td>
          <td>${inv.status}</td>
          <td>${new Date(inv.created_at || inv.date).toLocaleString()}</td>
        `;
        investmentsTableBody.appendChild(row);
      });
    } else {
      investmentsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No investments</td></tr>`;
    }
  } catch (err) {
    showAlert(investmentAlert, 'Error fetching investments', false);
    console.error(err);
  }
}

// ==========================
// Fetch Top-Ups
// ==========================
async function fetchTopups() {
  try {
    const res = await fetch('/admin/topups', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    topupTableBody.innerHTML = '';

    if (data.success && Array.isArray(data.topups) && data.topups.length) {
      const topups = data.topups.sort((a, b) => (Number(b.id || b._id) - Number(a.id || a._id)));
      topups.forEach(entry => {
        const id = entry.id || entry._id;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${id}</td>
          <td>${entry.user || entry.username || 'Unknown'}</td>
          <td>${entry.amount}</td>
          <td>${entry.admin || 'Admin'}</td>
          <td>${new Date(entry.date).toLocaleString()}</td>
        `;
        if (Number(id) > lastTopupId) {
          row.style.backgroundColor = '#d4edda';
          setTimeout(() => { row.style.transition = 'background-color 2s'; row.style.backgroundColor = ''; }, 2000);
        }
        topupTableBody.appendChild(row);
      });
      lastTopupId = Number(topups[0].id || topups[0]._id);
    } else {
      topupTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No top-ups</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching top-ups:', err);
    topupTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Failed to load top-up history.</td></tr>`;
  }
}

// ==========================
// Refresh All
// ==========================
function refreshAll() {
  fetchUsers();
  fetchTrades();
  fetchWithdrawals();
  fetchInvestments();
  fetchTopups();
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
