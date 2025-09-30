// ==========================
// TradeSphere Admin Dashboard JS (Full Version)
// ==========================

const usersTableBody = document.querySelector('#usersTable tbody');
const tradesTableBody = document.querySelector('#tradesTable tbody');
const withdrawalsTableBody = document.querySelector('#withdrawalsTable tbody');
const investmentsTableBody = document.querySelector('#investmentsTable tbody');

const userAlert = document.getElementById('userAlert');
const withdrawalAlert = document.getElementById('withdrawalAlert');
const investmentAlert = document.getElementById('investmentAlert');

const adminId = localStorage.getItem('userId');
const adminRole = localStorage.getItem('role');

// Redirect if not admin
if (!adminId || adminRole !== 'admin') {
  window.location.href = 'index.html';
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
// Fetch Users
// ==========================
async function fetchUsers() {
  try {
    const res = await fetch('/admin/users', {
      headers: { 'x-user-id': adminId }
    });
    const data = await res.json();
    usersTableBody.innerHTML = '';

    if (data.success && data.users.length > 0) {
      data.users.forEach(user => {
        const name = user.preferred_name || user.username || 'Unknown';
        const cash = user.cash !== null ? parseFloat(user.cash).toFixed(2) : '50.00';
        const btc = user.btc !== null ? parseFloat(user.btc).toFixed(6) : '0.000000';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${name}</td>
          <td>$${cash}</td>
          <td>${btc}</td>
          <td><button onclick="topUpUser('${user.id}')">Top Up</button></td>
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
  const cash = prompt("Enter CASH amount to top up (leave blank for none):");
  const btc = prompt("Enter BTC amount to top up (leave blank for none):");
  const investAmt = prompt("Enter INVESTMENT amount (leave blank for none):");
  let investPlan = null;

  if (investAmt && !isNaN(investAmt)) {
    investPlan = prompt("Enter Investment Plan name:") || "Custom Plan";
  }

  if (!cash && !btc && !investAmt) return;

  try {
    const res = await fetch('/admin/topup', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': adminId
      },
      body: JSON.stringify({
        userId,
        cash: cash ? parseFloat(cash) : 0,
        btc: btc ? parseFloat(btc) : 0,
        investmentAmount: investAmt ? parseFloat(investAmt) : 0,
        investmentPlan: investPlan
      })
    });
    const data = await res.json();
    showAlert(userAlert, data.message, data.success);
    fetchUsers();
    fetchInvestments();
  } catch (err) {
    showAlert(userAlert, 'Top up failed', false);
    console.error(err);
  }
}

// ==========================
// Fetch Trades
// ==========================
async function fetchTrades() {
  try {
    const res = await fetch('/admin/trades', {
      headers: { 'x-user-id': adminId }
    });
    const data = await res.json();
    tradesTableBody.innerHTML = '';

    if (data.success && data.trades.length > 0) {
      data.trades.forEach(trade => {
        const name = trade.preferred_name || trade.username || 'Unknown';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${name}</td>
          <td>${new Date(trade.date).toLocaleString()}</td>
          <td>${trade.type}</td>
          <td>${parseFloat(trade.amount).toFixed(6)}</td>
          <td>${parseFloat(trade.price).toFixed(2)}</td>
        `;
        tradesTableBody.appendChild(row);
      });
    } else {
      tradesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No trades found</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching trades:', err);
  }
}

// ==========================
// Fetch Withdrawals
// ==========================
async function fetchWithdrawals() {
  try {
    const res = await fetch('/admin/withdrawals', {
      headers: { 'x-user-id': adminId }
    });
    const data = await res.json();
    withdrawalsTableBody.innerHTML = '';

    if (data.success && data.withdrawals.length > 0) {
      data.withdrawals.forEach(w => {
        const name = w.preferred_name || w.username || 'Unknown';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${name}</td>
          <td>${new Date(w.date).toLocaleString()}</td>
          <td>${parseFloat(w.amount).toFixed(2)}</td>
          <td>${w.wallet || '-'}</td>
          <td>${w.status}</td>
          <td>${w.status === 'pending' ? `<button onclick="approveWithdrawal('${w.id}')">Approve</button>` : '-'}</td>
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
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': adminId
      },
      body: JSON.stringify({ withdrawalId })
    });
    const data = await res.json();
    showAlert(withdrawalAlert, data.message, data.success);
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
    const res = await fetch('/admin/investments', {
      headers: { 'x-user-id': adminId }
    });
    const data = await res.json();
    investmentsTableBody.innerHTML = '';

    if (data.success && data.investments.length > 0) {
      data.investments.forEach(inv => {
        const name = inv.preferred_name || inv.username || 'Unknown';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${name}</td>
          <td>$${parseFloat(inv.amount).toFixed(2)}</td>
          <td>${inv.plan}</td>
          <td>${inv.status}</td>
          <td>${new Date(inv.created_at).toLocaleString()}</td>
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
// Initial Fetch & Auto-refresh
// ==========================
fetchUsers();
fetchTrades();
fetchWithdrawals();
fetchInvestments();

setInterval(() => {
  fetchUsers();
  fetchTrades();
  fetchWithdrawals();
  fetchInvestments();
}, 5000);

// ==========================
// Logout
// ==========================
document.getElementById('adminLogout').addEventListener('click', () => {
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
  window.location.href = 'index.html';
});
