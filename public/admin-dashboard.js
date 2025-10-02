// ==========================
// TradeSphere Admin Dashboard JS (Full & Fixed Top-Up + Support + Info + Reduce + Open Chat + Live Support Chat)
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
          <td><button onclick="openSupportChat('${userId}')">Chat</button></td>
        `;
        usersTableBody.appendChild(row);
      });
    } else {
      usersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No users found</td></tr>`;
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
          <td>${entry.username || entry.user || 'Unknown'}</td>
          <td>${entry.amount}</td>
          <td>${entry.admin || entry.admin_id || 'Admin'}</td>
          <td>${new Date(entry.date).toLocaleString()}</td>
        `;
        topupTableBody.appendChild(row);
      });
    } else {
      topupTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No top-ups</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching top-ups:', err);
    topupTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Failed to load top-up history.</td></tr>`;
  }
}

// ==========================
// Support Chat
// ==========================
const supportChatWindow = document.getElementById('supportChatWindow');
const supportMessages = document.getElementById('supportMessages');
const supportMessageInput = document.getElementById('supportMessageInput');
const sendSupportMessageBtn = document.getElementById('sendSupportMessage');

let currentChatUserId = null;
let lastMessageId = 0;
let supportPollInterval = null;

document.getElementById('openSupportChat').addEventListener('click', () => {
  supportChatWindow.style.display = 'flex';
  currentChatUserId = null;
  supportMessages.innerHTML = '<div style="color:#888;text-align:center;">Select a user from Users table to chat.</div>';
});

sendSupportMessageBtn.addEventListener('click', async () => {
  const message = supportMessageInput.value.trim();
  if (!message) return;
  if (!currentChatUserId) return alert('No user selected for chat!');

  try {
    const res = await fetch('/admin/support/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ userId: currentChatUserId, message })
    });
    const data = await res.json();
    if (data.success) {
      supportMessageInput.value = '';
      fetchSupportMessages(currentChatUserId, true); // fetch only new messages
    } else {
      alert('Failed to send message.');
    }
  } catch (err) {
    console.error(err);
    alert('Error sending message.');
  }
});

function openSupportChat(userId) {
  currentChatUserId = userId;
  lastMessageId = 0;
  supportChatWindow.style.display = 'flex';
  supportMessages.innerHTML = '<div style="color:#888;text-align:center;">Loading messages...</div>';
  fetchSupportMessages(userId, false);

  if (supportPollInterval) clearInterval(supportPollInterval);
  supportPollInterval = setInterval(() => fetchSupportMessages(userId, true), 1000);
}

async function fetchSupportMessages(userId, fetchNewOnly = false) {
  if (!userId) return;
  try {
    const res = await fetch(`/admin/support/messages/${userId}?after=${fetchNewOnly ? lastMessageId : 0}`, {
      headers: { 'x-user-id': adminId }
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.messages)) {
      if (!fetchNewOnly) supportMessages.innerHTML = ''; // first load clear old
      data.messages.forEach(msg => {
        const sender = msg.sender === 'admin' ? 'You' : 'User';
        const div = document.createElement('div');
        div.innerHTML = `<b>${sender}:</b> ${escapeHtml(msg.message)}`;
        supportMessages.appendChild(div);
        if (msg.id) lastMessageId = Math.max(lastMessageId, msg.id);
      });
      supportMessages.scrollTop = supportMessages.scrollHeight;
    } else if (!fetchNewOnly) {
      supportMessages.innerHTML = `<div style="color:#888;">No messages yet.</div>`;
    }
  } catch (err) {
    console.error(err);
    if (!fetchNewOnly) supportMessages.innerHTML = `<div style="color:#888;">Failed to load messages.</div>`;
  }
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return unsafe.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
