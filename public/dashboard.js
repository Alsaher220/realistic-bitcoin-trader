// =========================
// TradeSphere User Dashboard JS with Live Support Chat + NFT Gallery
// =========================

const userId = localStorage.getItem('userId');
if (!userId) window.location.href = 'index.html';

const usernameSpan = document.getElementById('username');
const cashSpan = document.getElementById('cash');
const btcSpan = document.getElementById('btc');
const withdrawalsTable = document.querySelector('#withdrawalsTable tbody');
const investmentsTable = document.querySelector('#investmentsTable tbody');
const withdrawAlert = document.getElementById('withdrawAlert');
const supportAlert = document.getElementById('supportAlert');
const supportMessagesBox = document.getElementById('supportMessages');
const supportForm = document.getElementById('supportForm');
const supportMessageInput = document.getElementById('supportMessage');
const openSupportBtn = document.getElementById('openSupportBtn');
const nftGallery = document.getElementById('nftGallery');

const START_CASH = 50;
let supportPollInterval = null;

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
    renderSupportMessages(data.supportMessages || []);
    renderNFTs(data.nfts || []);
  } catch (err) {
    console.error('Error fetching user data:', err);
  }
}

// ==========================
// Render Withdrawals
// ==========================
function renderWithdrawals(withdrawals = []) {
  withdrawalsTable.innerHTML = '';
  if (!withdrawals.length) {
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
  if (!investments.length) {
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
// Render NFT Gallery
// ==========================
function renderNFTs(nfts = []) {
  if (!nftGallery) return;

  nftGallery.innerHTML = '';
  
  if (!nfts.length) {
    nftGallery.innerHTML = `<p style="text-align:center;color:#666;grid-column:1/-1;">No NFTs in your collection yet.</p>`;
    return;
  }

  nfts.forEach(nft => {
    const nftCard = document.createElement('div');
    nftCard.className = 'nft-card';
    nftCard.style.cssText = `
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
      cursor: pointer;
    `;

    nftCard.innerHTML = `
      <img src="${nft.image_url}" alt="${nft.title}" style="width:100%;height:200px;object-fit:cover;">
      <div style="padding:15px;">
        <h3 style="margin:0 0 8px 0;font-size:18px;color:#333;">${nft.title}</h3>
        <p style="margin:0 0 8px 0;font-size:14px;color:#666;line-height:1.4;">${nft.description || 'No description available'}</p>
        ${nft.collection_name ? `<p style="margin:4px 0;font-size:12px;color:#888;"><strong>Collection:</strong> ${nft.collection_name}</p>` : ''}
        ${nft.blockchain ? `<p style="margin:4px 0;font-size:12px;color:#888;"><strong>Blockchain:</strong> ${nft.blockchain}</p>` : ''}
        <p style="margin:4px 0;font-size:11px;color:#aaa;">Received: ${new Date(nft.assigned_at).toLocaleDateString()}</p>
      </div>
    `;

    nftCard.addEventListener('mouseenter', () => {
      nftCard.style.transform = 'translateY(-5px)';
      nftCard.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
    });

    nftCard.addEventListener('mouseleave', () => {
      nftCard.style.transform = 'translateY(0)';
      nftCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    });

    nftGallery.appendChild(nftCard);
  });
}

// ==========================
// Render Support Messages
// ==========================
function renderSupportMessages(messages = []) {
  if (!supportMessagesBox) return;

  supportMessagesBox.innerHTML = '';
  if (!messages.length) {
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

    div.innerHTML = `<strong>${senderLabel}:</strong> ${messageText}<br><small style="color:#888;">${new Date(timestamp).toLocaleString()}</small>`;
    supportMessagesBox.appendChild(div);
  });

  supportMessagesBox.scrollTop = supportMessagesBox.scrollHeight;
  supportMessagesBox._currentMessages = messages;
}

// ==========================
// Withdraw Functionality
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
// Support Form Submission
// ==========================
supportForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const message = supportMessageInput.value.trim();
  if (!message) return;

  try {
    const res = await fetch('/support/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message })
    });
    const data = await res.json();
    if (data.success) {
      const newMsg = { sender: 'user', message, created_at: Date.now() };
      const updatedMessages = [...(supportMessagesBox._currentMessages || []), newMsg];
      renderSupportMessages(updatedMessages);
      supportMessageInput.value = '';
      showAlert(supportAlert, 'Message sent to support!', true);
    } else {
      showAlert(supportAlert, data.message || 'Failed to send message', false);
    }
  } catch (err) {
    showAlert(supportAlert, 'Error sending support message', false);
  }
});

// ==========================
// Live Support Polling
// ==========================
function startSupportPolling() {
  if (supportPollInterval) clearInterval(supportPollInterval);
  supportPollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/user/${userId}`);
      const data = await res.json();
      if (data.success) renderSupportMessages(data.supportMessages || []);
    } catch (err) {
      console.error('Error polling support messages:', err);
    }
  }, 1000);
}

// ==========================
// Open Support Chat Button
// ==========================
openSupportBtn?.addEventListener('click', () => {
  if (!supportMessagesBox) return;

  supportMessagesBox.style.display = supportMessagesBox.style.display === 'block' ? 'none' : 'block';
  if (supportMessagesBox.style.display === 'block') startSupportPolling();
  else clearInterval(supportPollInterval);
});

// ==========================
// About Company Modal
// ==========================
const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const aboutClose = document.getElementById('aboutClose');

if (aboutBtn && aboutModal && aboutClose) {
  aboutBtn.addEventListener('click', () => { aboutModal.style.display = 'block'; });
  aboutClose.addEventListener('click', () => { aboutModal.style.display = 'none'; });
  window.addEventListener('click', e => { if (e.target === aboutModal) aboutModal.style.display = 'none'; });
}

// ==========================
// Logout
// ==========================
function logout() {
  localStorage.removeItem('userId');
  window.location.href = 'index.html';
}
document.getElementById('logoutBtn')?.addEventListener('click', logout);

// ==========================
// Initial Fetch + Auto-Refresh
// ==========================
fetchUserData();
setInterval(fetchUserData, 5000);
