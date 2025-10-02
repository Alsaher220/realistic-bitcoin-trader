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
const withdrawAlert = document.getElementById('withdrawAlert');
const supportAlert = document.getElementById('supportAlert'); // Support feedback
const supportMessagesBox = document.getElementById('supportMessages');
const openSupportBtn = document.getElementById('openSupportBtn'); // Button to open chat

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

    usernameSpan.textContent = user.preferred_name || user.preferredName || user.username || 'Unknown';

    let cash = parseFloat(user.cash);
    if (isNaN(cash) || cash === null) cash = START_CASH;
    cashSpan.textContent = cash.toFixed(2);

    let btc = parseFloat(user.btc);
    if (isNaN(btc) || btc === null) btc = 0;
    btcSpan.textContent = btc.toFixed(6);

    renderWithdrawals(data.withdrawals || []);
    renderInvestments(data.investments || []);

    // Do NOT render support messages automatically
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
// Render Support Messages
// ==========================
function renderSupportMessages(messages = []) {
  if (!supportMessagesBox) return;

  supportMessagesBox.innerHTML = '';
  if (messages.length === 0) {
    supportMessagesBox.innerHTML = `<p style="text-align:center;color:#666;">No messages yet.</p>`;
    return;
  }

  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'support-message';
    div.style.borderBottom = '1px solid #ddd';
    div.style.padding = '5px 0';

    const senderLabel = msg.sender === 'user' ? 'You' : 'Support';
    const messageText = msg.message || msg.text || '';
    const timestamp = msg.created_at || msg.date || Date.now();

    div.innerHTML = `
      <strong>${senderLabel}:</strong> ${messageText}<br>
      <small style="color:#888;">${new Date(timestamp).toLocaleString()}</small>
    `;
    supportMessagesBox.appendChild(div);
  });

  supportMessagesBox.scrollTop = supportMessagesBox.scrollHeight;
  supportMessagesBox._currentMessages = messages;
}

// ==========================
// Show Alerts
// ==========================
function showAlert(el, msg, isSuccess = true) {
  if (!el) return;
  el.textContent = msg;
  el.className = `alert ${isSuccess ? 'success' : 'error'}`;
  el.style.display = 'block';
  setTimeout(() => (el.style.display = 'none'), 3000);
}

// ==========================
// Withdraw
// ==========================
document.getElementById('withdrawForm')?.addEventListener('submit', async e => {
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
// Support - Send Message
// ==========================
document.getElementById('supportForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const message = document.getElementById('supportMessage').value.trim();
  if (!message) return;

  try {
    const res = await fetch('/support/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message })
    });
    const data = await res.json();

    if (data.success) {
      showAlert(supportAlert, data.message || 'Message sent to support!', true);

      const newMsg = { sender: 'user', message: message, created_at: Date.now() };
      const updatedMessages = [...(supportMessagesBox._currentMessages || []), newMsg];
      renderSupportMessages(updatedMessages);

      document.getElementById('supportMessage').value = '';
    } else {
      showAlert(supportAlert, data.message || 'Failed to send message', false);
    }
  } catch (err) {
    showAlert(supportAlert, 'Error sending support message', false);
    console.error(err);
  }
});

// ==========================
// Open Support Chat on Click
// ==========================
openSupportBtn?.addEventListener('click', async () => {
  supportMessagesBox.style.display = 'block'; // Show chat box
  try {
    const res = await fetch(`/user/${userId}`);
    const data = await res.json();
    if (data.success) renderSupportMessages(data.supportMessages || []);
  } catch (err) {
    console.error('Error loading support messages:', err);
  }
});

// ==========================
// About Company Modal Logic
// ==========================
const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const aboutClose = document.getElementById('aboutClose');

if (aboutBtn && aboutModal && aboutClose) {
  aboutBtn.addEventListener('click', () => {
    aboutModal.style.display = 'block';
  });

  aboutClose.addEventListener('click', () => {
    aboutModal.style.display = 'none';
  });

  window.addEventListener('click', e => {
    if (e.target === aboutModal) {
      aboutModal.style.display = 'none';
    }
  });
}

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
