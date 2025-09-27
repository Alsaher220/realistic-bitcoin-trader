// ==========================
// Admin Dashboard JS
// ==========================

const usersTableBody = document.querySelector('#usersTable tbody');
const tradesTableBody = document.querySelector('#tradesTable tbody');
const withdrawalsTableBody = document.querySelector('#withdrawalsTable tbody');

const userAlert = document.getElementById('userAlert');
const withdrawalAlert = document.getElementById('withdrawalAlert');

// ==========================
// Fetch and Display Users
// ==========================
async function fetchUsers() {
  try {
    const res = await fetch('/admin/users');
    const data = await res.json();
    usersTableBody.innerHTML = '';
    if (data.success) {
      data.users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.username}</td>
          <td>$${parseFloat(user.cash).toFixed(2)}</td>
          <td>${parseFloat(user.btc).toFixed(6)}</td>
          <td>
            <button onclick="topUpUser('${user.id}')">Top Up</button>
          </td>
        `;
        usersTableBody.appendChild(row);
      });
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
  const amount = prompt("Enter amount to top up:");
  if (!amount || isNaN(amount)) return;

  try {
    const res = await fetch('/admin/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount: parseFloat(amount) })
    });
    const data = await res.json();
    showAlert(userAlert, data.message, data.success);
    fetchUsers();
  } catch (err) {
    showAlert(userAlert, 'Top up failed', false);
    console.error(err);
  }
}

// ==========================
// Fetch and Display Trades
// ==========================
async function fetchTrades() {
  try {
    const res = await fetch('/admin/trades');
    const data = await res.json();
    tradesTableBody.innerHTML = '';
    if (data.success) {
      data.trades.forEach(trade => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${trade.username}</td>
          <td>${new Date(trade.date).toLocaleString()}</td>
          <td>${trade.type}</td>
          <td>${parseFloat(trade.amount).toFixed(6)}</td>
          <td>${parseFloat(trade.price).toFixed(2)}</td>
        `;
        tradesTableBody.appendChild(row);
      });
    }
  } catch (err) {
    console.error('Error fetching trades:', err);
  }
}

// ==========================
// Fetch and Display Withdrawals
// ==========================
async function fetchWithdrawals() {
  try {
    const res = await fetch('/admin/withdrawals');
    const data = await res.json();
    withdrawalsTableBody.innerHTML = '';
    if (data.success) {
      data.withdrawals.forEach(w => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${w.username}</td>
          <td>${new Date(w.date).toLocaleString()}</td>
          <td>${parseFloat(w.amount).toFixed(2)}</td>
          <td>${w.wallet}</td>
          <td>${w.status}</td>
          <td>
            ${w.status === 'pending' ? `<button onclick="approveWithdrawal('${w.id}')">Approve</button>` : ''}
          </td>
        `;
        withdrawalsTableBody.appendChild(row);
      });
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
    const res = await fetch('/admin/withdrawals/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
// Show Alert Function
// ==========================
function showAlert(element, message, isSuccess = true) {
  element.textContent = message;
  element.className = `alert ${isSuccess ? 'success' : 'error'}`;
  element.style.display = 'block';
  setTimeout(() => { element.style.display = 'none'; }, 3000);
}

// ==========================
// Initial Fetch
// ==========================
fetchUsers();
fetchTrades();
fetchWithdrawals();

// Optional: auto-refresh every 5-10 seconds
setInterval(() => {
  fetchUsers();
  fetchTrades();
  fetchWithdrawals();
}, 5000);
