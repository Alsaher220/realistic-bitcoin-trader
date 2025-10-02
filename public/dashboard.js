// =========================
// TradeSphere Dashboard JS (Updated)
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
const supportSection = document.getElementById('supportSection'); // Container for support chat
const supportToggleBtn = document.getElementById('supportToggleBtn'); // Button to open chat
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

    // Fix: display info clearly
    usernameSpan.textContent = user.preferred_name || user.preferredName || user.username || 'Unknown';
    usernameSpan.style.filter = 'none';
    usernameSpan.style.textShadow = 'none';
    usernameSpan.style.color = '#FFD700'; // Make sure visible

    let cash = parseFloat(user.cash);
    if (isNaN(cash) || cash === null) cash = START_CASH;
    cashSpan.textContent = cash.toFixed(2);
    cashSpan.style.filter = 'none';
    cashSpan.style.textShadow = 'none';

    let btc = parseFloat(user.btc);
    if (isNaN(btc) || btc === null) btc = 0;
    btcSpan.textContent = btc.toFixed(6);
    btcSpan.style.filter = 'none';
    btcSpan.style.textShadow = 'none';

    renderWithdrawals(data.withdrawals || []);
    renderInvestments(data.investments || []);

    // Only update support messages if chat is open
    if (supportSection.style.display === 'block') {
      renderSupportMessages(data.supportMessages || []);
    }
  } catch (err) {
    console.error('Error fetching user data:', err);
  }
}

// ==========================
// Toggle Support Chat
// ==========================
supportToggleBtn?.addEventListener('click', () => {
  if (!supportSection) return;
  if (supportSection.style.display === 'block') {
    supportSection.style.display = 'none';
  } else {
    supportSection.style.display = 'block';
    // Load messages when opened
    fetchUserData();
  }
});

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
      showAlert(supportAlert, data.message || 'Message sent!', true);

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
// Buy, Sell, Withdraw, Modal, Logout
// (No changes, keep original logic)
// ==========================

fetchUserData();
setInterval(fetchUserData, 5000);
