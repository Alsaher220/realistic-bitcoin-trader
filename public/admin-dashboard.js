// admin-dashboard.js

// ------------------- Admin Secret Handling -------------------
function getAdminSecret() {
  return sessionStorage.getItem('ADMIN_SECRET');
}

// Redirect to login if not present
(function ensureAdmin() {
  if (!getAdminSecret()) window.location.href = 'admin.html';
})();

// Wrapper for admin fetch requests
async function fetchAdmin(url, options = {}) {
  const secret = getAdminSecret();
  if (!secret) {
    window.location.href = 'admin.html';
    throw new Error('Admin secret missing');
  }
  options.headers = options.headers || {};
  options.headers['x-admin-secret'] = secret;

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  return fetch(url, options);
}

// Logout button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('adminLogout');
  if (btn) btn.addEventListener('click', () => {
    sessionStorage.removeItem('ADMIN_SECRET');
    window.location.href = 'admin.html';
  });
});

// ------------------- Alerts -------------------
function showAlert(element, message, success=true) {
  element.textContent = message;
  element.className = `alert ${success ? 'success' : 'error'}`;
  element.style.display = 'block';
  setTimeout(() => { element.style.display = 'none'; }, 3000);
}

// ------------------- Users -------------------
async function loadUsers() {
  try {
    const res = await fetchAdmin('/admin/users');
    const data = await res.json();
    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = "";
    data.users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.username}</td>
        <td>$${u.cash}</td>
        <td>${u.btc} BTC</td>
        <td>
          <input type="number" id="cash-${u.id}" placeholder="Cash">
          <input type="number" id="btc-${u.id}" placeholder="BTC">
          <button class="action-btn" onclick="topUp(${u.id})">Top Up</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch(err) {
    console.error(err);
    showAlert(document.getElementById('userAlert'), 'Failed to load users', false);
  }
}

async function topUp(userId) {
  const cash = parseFloat(document.getElementById(`cash-${userId}`).value) || 0;
  const btc = parseFloat(document.getElementById(`btc-${userId}`).value) || 0;
  try {
    await fetchAdmin('/admin/topup', { method:'POST', body:{ userId, cash, btc } });
    showAlert(document.getElementById('userAlert'), 'User topped up successfully');
    loadUsers();
  } catch(err) {
    console.error(err);
    showAlert(document.getElementById('userAlert'), 'Top-up failed', false);
  }
}

// ------------------- Trades -------------------
async function loadTrades() {
  try {
    const res = await fetchAdmin('/admin/trades');
    const data = await res.json();
    const tbody = document.querySelector("#tradesTable tbody");
    tbody.innerHTML = "";
    data.trades.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.username}</td>
        <td>${new Date(t.date).toLocaleString()}</td>
        <td>${t.type}</td>
        <td>${t.amount}</td>
        <td>${t.price}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch(err) {
    console.error(err);
  }
}

// ------------------- Withdrawals -------------------
async function loadWithdrawals() {
  try {
    const res = await fetchAdmin('/admin/withdrawals');
    const data = await res.json();
    const tbody = document.querySelector("#withdrawalsTable tbody");
    tbody.innerHTML = "";
    data.withdrawals.forEach(w => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${w.username}</td>
        <td>${new Date(w.date).toLocaleString()}</td>
        <td>$${w.amount}</td>
        <td>${w.wallet}</td>
        <td>${w.status}</td>
        <td>
          ${w.status === 'pending' ? `<button class="action-btn" onclick="processWithdrawal(${w.id})">Process</button>` : '✅ Processed'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch(err) {
    console.error(err);
    showAlert(document.getElementById('withdrawalAlert'), 'Failed to load withdrawals', false);
  }
}

async function processWithdrawal(id) {
  try {
    await fetchAdmin('/admin/withdrawals/process', { method:'POST', body:{ id } });
    showAlert(document.getElementById('withdrawalAlert'), 'Withdrawal processed successfully');
    loadWithdrawals();
  } catch(err) {
    console.error(err);
    showAlert(document.getElementById('withdrawalAlert'), 'Failed to process withdrawal', false);
  }
}

// ------------------- Initial Load -------------------
loadUsers();
loadTrades();
loadWithdrawals();
