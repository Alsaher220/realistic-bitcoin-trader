// Redirect if no userId is saved (user not logged in)
if (!localStorage.getItem('userId')) {
  window.location.href = 'index.html';
}

const userId = localStorage.getItem('userId'); // Set on login
const usernameSpan = document.getElementById('username');
const cashSpan = document.getElementById('cash');
const btcSpan = document.getElementById('btc');
const withdrawalsTable = document.querySelector('#withdrawalsTable tbody');
const investmentsTable = document.querySelector('#investmentsTable tbody'); // Investments table

// Alert elements
const buyAlert = document.getElementById('buyAlert');
const sellAlert = document.getElementById('sellAlert');
const withdrawAlert = document.getElementById('withdrawAlert');

// Fetch user portfolio data
async function fetchUserData() {
  try {
    const res = await fetch(`/user/${userId}/portfolio`);
    const data = await res.json();
    if (data.success) {
      const user = data.portfolio.user;
      usernameSpan.textContent = user.username;
      cashSpan.textContent = parseFloat(user.cash).toFixed(2);
      btcSpan.textContent = parseFloat(user.btc).toFixed(6);

      loadWithdrawals(userId);
      loadInvestments(data.portfolio.investments);
    }
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
}

// Load withdrawals
async function loadWithdrawals(userId) {
  try {
    const res = await fetch(`/user/${userId}/withdrawals`);
    const data = await res.json();
    withdrawalsTable.innerHTML = '';

    if (data.success && data.withdrawals.length > 0) {
      data.withdrawals.forEach(w => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${parseFloat(w.amount).toFixed(2)}</td>
          <td>${w.wallet}</td>
          <td>${w.status}</td>
          <td>${new Date(w.date).toLocaleString()}</td>
        `;
        withdrawalsTable.appendChild(row);
      });
    } else {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4" style="text-align:center;">No withdrawals yet</td>`;
      withdrawalsTable.appendChild(row);
    }
  } catch (err) {
    console.error("Error loading withdrawals:", err);
  }
}

// Load investments
function loadInvestments(investments = []) {
  if (!investmentsTable) return;
  investmentsTable.innerHTML = '';

  if (investments.length > 0) {
    investments.forEach(inv => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${inv.plan}</td>
        <td>${parseFloat(inv.amount).toFixed(2)}</td>
        <td>${inv.status}</td>
        <td>${new Date(inv.created_at).toLocaleString()}</td>
      `;
      investmentsTable.appendChild(row);
    });
  } else {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4" style="text-align:center;">No investments yet</td>`;
    investmentsTable.appendChild(row);
  }
}

// Alert helper
function showAlert(element, message, isSuccess = true) {
  element.textContent = message;
  element.className = `alert ${isSuccess ? 'success' : 'error'}`;
  element.style.display = 'block';
  setTimeout(() => { element.style.display = 'none'; }, 3000);
}

// Buy BTC
document.getElementById('buyForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('buyAmount').value);
  const price = parseFloat(document.getElementById('buyPrice').value);

  try {
    const res = await fetch('/buy', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, amount, price})
    });
    const data = await res.json();
    showAlert(buyAlert, data.message || 'BTC purchased!', data.success);
    fetchUserData();
    e.target.reset();
  } catch (err) {
    console.error("Buy error:", err);
    showAlert(buyAlert, 'Error purchasing BTC', false);
  }
});

// Sell BTC
document.getElementById('sellForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('sellAmount').value);
  const price = parseFloat(document.getElementById('sellPrice').value);

  try {
    const res = await fetch('/sell', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, amount, price})
    });
    const data = await res.json();
    showAlert(sellAlert, data.message || 'BTC sold!', data.success);
    fetchUserData();
    e.target.reset();
  } catch (err) {
    console.error("Sell error:", err);
    showAlert(sellAlert, 'Error selling BTC', false);
  }
});

// Withdraw
document.getElementById('withdrawForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('withdrawAmount').value);
  const wallet = document.getElementById('withdrawWallet').value;

  try {
    const res = await fetch('/withdraw', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userId, amount, wallet})
    });
    const data = await res.json();
    showAlert(withdrawAlert, data.message, data.success);
    fetchUserData();
    e.target.reset();
  } catch (err) {
    console.error("Withdraw error:", err);
    showAlert(withdrawAlert, 'Error requesting withdrawal', false);
  }
});

// Initial fetch
fetchUserData();

// Auto-refresh every 5 seconds
setInterval(fetchUserData, 5000);

// Logout
function logout() {
  localStorage.removeItem('userId');
  window.location.href = 'index.html';
}
