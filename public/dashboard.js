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
const supportAlert = document.getElementById('supportAlert'); // Support feedback
const supportMessagesBox = document.getElementById('supportMessages');

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

    // Support Messages
    renderSupportMessages(data.supportMessages || []);
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
    div.innerHTML = `
      <strong>${msg.from === 'user' ? 'You' : 'Support'}:</strong> ${msg.text}<br>
      <small style="color:#888;">${new Date(msg.date || Date.now()).toLocaleString()}</small>
    `;
    supportMessagesBox.appendChild(div);
  });

  // Auto-scroll to latest message
  supportMessagesBox.scrollTop = supportMessagesBox.scrollHeight;
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
// Buy BTC
// ==========================
document.getElementById('buyForm')?.addEventListener('submit', async e => {
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
document.getElementById('sellForm')?.addEventListener('submit', async e => {
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
  const message = document.getElementById('supportMessage').value;

  try {
    const res = await fetch('/support/message', { // <-- FIXED ROUTE
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message })
    });
    const data = await res.json();

    if (data.success) {
      showAlert(supportAlert, data.message || 'Message sent to support!', true);

      // Append the new message to the messages box
      const newMsg = { from: 'user', text: message, date: Date.now() };
      renderSupportMessages([...supportMessagesBox._currentMessages || [], newMsg]);
      // Save current messages for next update
      supportMessagesBox._currentMessages = [...supportMessagesBox._currentMessages || [], newMsg];

      document.getElementById('supportMessage').value = '';
    } else {
      showAlert(supportAlert, data.message || 'Failed to send message', false);
    }
  } catch (err) {
    showAlert(supportAlert, 'Error sending support message', false);
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
