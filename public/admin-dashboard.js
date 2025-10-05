// ==========================
// TradeSphere Admin Dashboard JS (Full Version with Real-Time Support Chat)
// ==========================

const usersTableBody = document.querySelector(’#usersTable tbody’);
const withdrawalsTableBody = document.querySelector(’#withdrawalsTable tbody’);
const investmentsTableBody = document.querySelector(’#investmentsTable tbody’);
const topupTableBody = document.querySelector(’#topupTable tbody’);

const userAlert = document.getElementById(‘userAlert’);
const withdrawalAlert = document.getElementById(‘withdrawalAlert’);
const investmentAlert = document.getElementById(‘investmentAlert’);

const adminId = localStorage.getItem(‘userId’);
const adminRole = localStorage.getItem(‘role’);

// Redirect if not admin
if (!adminId || adminRole !== ‘admin’) {
alert(‘Access denied! Admin login required.’);
window.location.href = ‘admin.html’;
}

// ==========================
// Show Alert Function
// ==========================
function showAlert(element, message, isSuccess = true) {
if (!element) return;
element.textContent = message;
element.className = `alert ${isSuccess ? 'success' : 'error'}`;
element.style.display = ‘block’;
setTimeout(() => { element.style.display = ‘none’; }, 3000);
}

// ==========================
// Fetch Users
// ==========================
async function fetchUsers() {
try {
const res = await fetch(’/admin/users’, { headers: { ‘x-user-id’: adminId } });
const data = await res.json();
usersTableBody.innerHTML = ‘’;

```
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
      <td><button class="delete-btn" onclick="deleteUser('${userId}', '${username}')">Delete</button></td>
    `;
    usersTableBody.appendChild(row);
  });
} else {
  usersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No users found</td></tr>`;
}
```

} catch (err) {
showAlert(userAlert, ‘Error fetching users’, false);
console.error(err);
}
}

// ==========================
// Delete User
// ==========================
async function deleteUser(userId, username) {
const confirm = window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone and will delete all their data (withdrawals, investments, messages).`);
if (!confirm) return;

try {
const res = await fetch(’/admin/delete-user’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’, ‘x-user-id’: adminId },
body: JSON.stringify({ userId })
});
const data = await res.json();
showAlert(userAlert, data.message || ‘User deleted’, data.success);
if (data.success) {
fetchUsers();
fetchInvestments();
fetchWithdrawals();
fetchTopups();
}
} catch (err) {
showAlert(userAlert, ‘Delete failed’, false);
console.error(err);
}
}

// ==========================
// Top Up User
// ==========================
async function topUpUser(userId) {
const cash = prompt(“Enter CASH amount to top up:”);
const btc = prompt(“Enter BTC amount to top up:”);
const investAmt = prompt(“Enter INVESTMENT amount:”);
let investPlan = investAmt ? prompt(“Enter Investment Plan name:”) || “Custom Plan” : null;

if (!cash && !btc && !investAmt) return;

try {
const res = await fetch(’/admin/topup’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’, ‘x-user-id’: adminId },
body: JSON.stringify({
userId,
cash: cash ? Number(cash) : 0,
btc: btc ? Number(btc) : 0,
investmentAmount: investAmt ? Number(investAmt) : 0,
investmentPlan: investPlan
})
});
const data = await res.json();
showAlert(userAlert, data.message || ‘Top-up processed’, data.success);
fetchUsers();
fetchInvestments();
fetchTopups();
} catch (err) {
showAlert(userAlert, ‘Top-up failed’, false);
console.error(err);
}
}

// ==========================
// Reduce User Balance
// ==========================
async function reduceUser(userId) {
const cash = prompt(“Enter CASH amount to reduce:”);
const btc = prompt(“Enter BTC amount to reduce:”);
if (!cash && !btc) return;

try {
const res = await fetch(’/admin/reduce’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’, ‘x-user-id’: adminId },
body: JSON.stringify({ userId, cash: cash ? Number(cash) : 0, btc: btc ? Number(btc) : 0 })
});
const data = await res.json();
showAlert(userAlert, data.message || ‘Reduction processed’, data.success);
fetchUsers();
fetchTopups();
} catch (err) {
showAlert(userAlert, ‘Reduction failed’, false);
console.error(err);
}
}

// ==========================
// Fetch Withdrawals
// ==========================
async function fetchWithdrawals() {
try {
const res = await fetch(’/admin/withdrawals’, { headers: { ‘x-user-id’: adminId } });
const data = await res.json();

```
if (!withdrawalsTableBody) return;

withdrawalsTableBody.innerHTML = '';

if (data.success && Array.isArray(data.withdrawals) && data.withdrawals.length) {
  data.withdrawals.forEach(w => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${w.username}</td>
      <td>${new Date(w.date).toLocaleString()}</td>
      <td>$${Number(w.amount).toFixed(2)}</td>
      <td>${w.wallet || '-'}</td>
      <td>${w.status}</td>
      <td>${w.status === 'pending' ? `<button onclick="approveWithdrawal(${w.id})">Approve</button>` : 'Processed'}</td>
    `;
    withdrawalsTableBody.appendChild(row);
  });
} else {
  withdrawalsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No withdrawals found</td></tr>`;
}
```

} catch (err) {
console.error(‘Error fetching withdrawals:’, err);
}
}

// ==========================
// Approve Withdrawal
// ==========================
async function approveWithdrawal(withdrawalId) {
try {
const res = await fetch(’/admin/withdrawals/process’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’, ‘x-user-id’: adminId },
body: JSON.stringify({ withdrawalId })
});
const data = await res.json();
showAlert(withdrawalAlert, data.message || ‘Withdrawal approved’, data.success);
fetchWithdrawals();
} catch (err) {
showAlert(withdrawalAlert, ‘Approval failed’, false);
console.error(err);
}
}

// ==========================
// Fetch Investments
// ==========================
async function fetchInvestments() {
try {
const res = await fetch(’/admin/investments’, { headers: { ‘x-user-id’: adminId } });
const data = await res.json();

```
if (!investmentsTableBody) return;

investmentsTableBody.innerHTML = '';

if (data.success && Array.isArray(data.investments) && data.investments.length) {
  data.investments.forEach(inv => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${inv.username}</td>
      <td>$${Number(inv.amount).toFixed(2)}</td>
      <td>${inv.plan}</td>
      <td>${inv.status}</td>
      <td>${new Date(inv.created_at).toLocaleString()}</td>
    `;
    investmentsTableBody.appendChild(row);
  });
} else {
  investmentsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No investments found</td></tr>`;
}
```

} catch (err) {
console.error(‘Error fetching investments:’, err);
}
}

// ==========================
// Fetch Top-Ups
// ==========================
async function fetchTopups() {
try {
const res = await fetch(’/admin/topups’, { headers: { ‘x-user-id’: adminId } });
const data = await res.json();

```
if (!topupTableBody) return;

topupTableBody.innerHTML = '';

if (data.success && Array.isArray(data.topups) && data.topups.length) {
  data.topups.forEach(topup => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${topup.id}</td>
      <td>${topup.username}</td>
      <td>$${Number(topup.amount).toFixed(2)}</td>
      <td>${new Date(topup.date).toLocaleString()}</td>
    `;
    topupTableBody.appendChild(row);
  });
} else {
  topupTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No top-ups found</td></tr>`;
}
```

} catch (err) {
console.error(‘Error fetching topups:’, err);
}
}

// ==========================
// Support Chat (Real-Time) - FIXED VERSION
// ==========================
const supportChatWindow = document.getElementById(‘supportChatWindow’);
const supportMessages = document.getElementById(‘supportMessages’);
const supportMessageInput = document.getElementById(‘supportMessageInput’);
const sendSupportMessageBtn = document.getElementById(‘sendSupportMessage’);

let currentChatUserId = null;
let supportPollInterval = null;
let displayedMessageIds = new Set();

// Open chat for a specific user
function openSupportChat(userId) {
console.log(‘openSupportChat called with userId:’, userId, ‘type:’, typeof userId);

if (!userId || userId === ‘undefined’ || userId === ‘null’) {
alert(’Invalid user selected! UserId: ’ + userId);
return;
}

currentChatUserId = userId;

if (!supportChatWindow) {
alert(‘Chat window element not found! Check your HTML.’);
return;
}

supportChatWindow.style.display = ‘flex’;
displayedMessageIds.clear();
supportMessages.innerHTML = ‘<div style="color:#888;">Loading messages…</div>’;
fetchSupportMessages();

if (supportPollInterval) clearInterval(supportPollInterval);
supportPollInterval = setInterval(fetchSupportMessages, 1000);
}

// Fetch messages and only show new ones - FIXED VERSION
async function fetchSupportMessages() {
if (!currentChatUserId) return;
try {
const res = await fetch(`/admin/support/messages/${currentChatUserId}`, {
headers: { ‘x-user-id’: adminId }
});
const data = await res.json();

```
if (data.success && Array.isArray(data.messages)) {
  let added = false;
  data.messages.forEach(msg => {
    const msgId = msg.id || msg._id || `${msg.created_at}-${msg.sender}`;
    
    if (!displayedMessageIds.has(msgId)) {
      const sender = msg.sender === 'admin' ? 'You' : 'User';
      const div = document.createElement('div');
      div.innerHTML = `<b>${sender}:</b> ${escapeHtml(msg.message)}`;
      supportMessages.appendChild(div);
      displayedMessageIds.add(msgId);
      added = true;
    }
  });
  if (added) supportMessages.scrollTop = supportMessages.scrollHeight;
}
```

} catch (err) {
console.error(err);
supportMessages.innerHTML = `<div style="color:#888;">Failed to load messages.</div>`;
}
}

// Send admin message
sendSupportMessageBtn?.addEventListener(‘click’, async () => {
const message = supportMessageInput.value.trim();
if (!message || !currentChatUserId) return alert(‘No user selected or empty message!’);
try {
const res = await fetch(’/admin/support/send’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’, ‘x-user-id’: adminId },
body: JSON.stringify({ userId: currentChatUserId, message })
});
const data = await res.json();
if (data.success) {
supportMessageInput.value = ‘’;
fetchSupportMessages();
} else {
alert(data.message || ‘Failed to send message’);
}
} catch (err) {
console.error(err);
alert(‘Error sending message.’);
}
});

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
if (!unsafe) return ‘’;
return unsafe.toString()
.replace(/&/g, “&”)
.replace(/</g, “<”)
.replace(/>/g, “>”)
.replace(/”/g, “"”)
.replace(/’/g, “'”);
}

// ==========================
// Initial Fetches
// ==========================
async function refreshAll() {
await fetchUsers();
await fetchWithdrawals();
await fetchInvestments();
await fetchTopups();
}
refreshAll();
setInterval(refreshAll, 5000);

// ==========================
// Logout
// ==========================
document.getElementById(‘adminLogout’)?.addEventListener(‘click’, () => {
localStorage.removeItem(‘userId’);
localStorage.removeItem(‘role’);
window.location.href = ‘admin.html’;
});
