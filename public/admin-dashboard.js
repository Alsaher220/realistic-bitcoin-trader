// ==========================
// TradeSphere Admin Dashboard JS (Support Fixed Only)
// ==========================

const usersTableBody = document.querySelector('#usersTable tbody');
const tradesTableBody = document.querySelector('#tradesTable tbody');
const withdrawalsTableBody = document.querySelector('#withdrawalsTable tbody');
const investmentsTableBody = document.querySelector('#investmentsTable tbody');
const topupTableBody = document.querySelector('#topupTable tbody');
const supportTableBody = document.querySelector('#supportTable tbody'); // support table tbody

const userAlert = document.getElementById('userAlert');
const withdrawalAlert = document.getElementById('withdrawalAlert');
const investmentAlert = document.getElementById('investmentAlert');

const adminId = localStorage.getItem('userId');
const adminRole = localStorage.getItem('role');

// Track last top-up id for highlights (was referenced previously)
let lastTopupId = 0;

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
// Support Messages
// ==========================
async function fetchSupportMessages() {
  try {
    if (!supportTableBody) return;
    const res = await fetch('/admin/support', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    supportTableBody.innerHTML = '';

    if (data.success && Array.isArray(data.messages) && data.messages.length) {
      data.messages.forEach(msg => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${msg.username || 'Unknown'}</td>
          <td style="text-align:left; white-space: pre-wrap;">${escapeHtml(msg.message)}</td>
          <td>${msg.sender}</td>
          <td>${new Date(msg.created_at).toLocaleString()}</td>
          <td><button onclick="replySupport('${msg.user_id}', '${msg.id}')">Reply</button></td>
        `;
        supportTableBody.appendChild(row);
      });
    } else {
      supportTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No support messages</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching support messages:', err);
  }
}

// Reply to a user's support message
async function replySupport(userId, messageId = null) {
  const reply = prompt("Enter your reply:");
  if (!reply) return;

  try {
    const res = await fetch('/admin/support/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ userId, message: reply, replyTo: messageId })
    });
    const data = await res.json();
    if (data.success) {
      showAlert(userAlert, 'Reply sent!', true);
      fetchSupportMessages();
    } else {
      showAlert(userAlert, data.message || 'Failed to send reply', false);
    }
  } catch (err) {
    showAlert(userAlert, 'Error sending reply', false);
    console.error(err);
  }
}

// Simple HTML escape for messages
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================
// Refresh All (keep other refresh logic as is)
// ==========================
function refreshAll() {
  fetchUsers();
  fetchTrades();
  fetchWithdrawals();
  fetchInvestments();
  fetchTopups();
  fetchSupportMessages(); // fixed support fetch
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
