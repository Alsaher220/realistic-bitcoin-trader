// ==========================
// TradeSphere Admin Dashboard JS (Full Version with Real-Time Support Chat)
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
    showAlert(userAlert, data.message || 'Top-up processed', data.success);
    fetchUsers();
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
      body: JSON.stringify({ userId, cash: cash ? Number(cash) : 0, btc: btc ? Number(btc) : 0 })
    });
    const data = await res.json();
    showAlert(userAlert, data.message || 'Reduction processed', data.success);
    fetchUsers();
  } catch (err) {
    showAlert(userAlert, 'Reduction failed', false);
    console.error(err);
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
let supportPollInterval = null;
let lastMessageId = 0; // tracks last message received

// Open chat window without selecting a user
document.getElementById('openSupportChat')?.addEventListener('click', () => {
  supportChatWindow.style.display = 'flex';
  currentChatUserId = null;
  supportMessages.innerHTML = '<div style="color:#888;text-align:center;">Select a user from Users table to chat.</div>';
});

// Open chat for a specific user
function openSupportChat(userId) {
  currentChatUserId = userId;
  lastMessageId = 0; // reset for new user
  supportChatWindow.style.display = 'flex';
  fetchSupportMessages();

  // Poll every second
  if (supportPollInterval) clearInterval(supportPollInterval);
  supportPollInterval = setInterval(fetchSupportMessages, 1000);
}

// Fetch only new support messages
async function fetchSupportMessages() {
  if (!currentChatUserId) return;
  try {
    const res = await fetch(`/admin/support/messages/new/${currentChatUserId}/${lastMessageId}`, {
      headers: { 'x-user-id': adminId }
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.messages) && data.messages.length) {
      data.messages.forEach(msg => {
        const sender = msg.sender === 'admin' ? 'You' : 'User';
        const div = document.createElement('div');
        div.innerHTML = `<b>${sender}:</b> ${escapeHtml(msg.message)}`;
        supportMessages.appendChild(div);
        lastMessageId = msg.id; // update last message ID
      });
      supportMessages.scrollTop = supportMessages.scrollHeight;
    }
  } catch (err) {
    console.error(err);
    supportMessages.innerHTML = `<div style="color:#888;">Failed to load messages.</div>`;
  }
}

// Send admin message to user
sendSupportMessageBtn?.addEventListener('click', async () => {
  const message = supportMessageInput.value.trim();
  if (!message || !currentChatUserId) return alert('No user selected or empty message!');
  try {
    const res = await fetch('/admin/support/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ userId: currentChatUserId, message })
    });
    const data = await res.json();
    if (data.success) {
      supportMessageInput.value = '';
      fetchSupportMessages();
    } else {
      alert(data.message || 'Failed to send message');
    }
  } catch (err) {
    console.error(err);
    alert('Error sending message.');
  }
});

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================
// Initial Fetches
// ==========================
async function refreshAll() {
  await fetchUsers();
  // Add other fetch functions for trades, withdrawals, investments, topups if needed
}
refreshAll();
setInterval(refreshAll, 5000);

// ==========================
// Logout
// ==========================
document.getElementById('adminLogout')?.addEventListener('click', () => {
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
  window.location.href = 'admin.html';
});
