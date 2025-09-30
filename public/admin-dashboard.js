// ==========================
// TradeSphere Admin Dashboard JS (Safe + Enhanced)
// ==========================

document.addEventListener('DOMContentLoaded', () => {
  const usersTableBody = document.querySelector('#usersTable tbody');
  const tradesTableBody = document.querySelector('#tradesTable tbody');
  const topupTableBody = document.querySelector('#topupTable tbody');

  let lastTopupId = 0; // To track new top-ups

  // Fetch Users
  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();

      usersTableBody.innerHTML = '';
      data.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.id}</td>
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${user.cash}</td>
          <td>${user.bitcoin}</td>
          <td>
            <button onclick="topUpUser(${user.id}, '${user.username}')">Top Up</button>
          </td>
        `;
        usersTableBody.appendChild(row);
      });
    } catch (err) {
      console.error('Error fetching users:', err);
      usersTableBody.innerHTML = `<tr><td colspan="6">Failed to load users.</td></tr>`;
    }
  }

  // Fetch Trades
  async function fetchTrades() {
    try {
      const res = await fetch('/api/trades');
      if (!res.ok) throw new Error('Failed to fetch trades');
      const data = await res.json();

      tradesTableBody.innerHTML = '';
      data.forEach(trade => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${trade.id}</td>
          <td>${trade.userId}</td>
          <td>${trade.type}</td>
          <td>${trade.amount}</td>
          <td>${trade.status}</td>
          <td>${trade.date}</td>
        `;
        tradesTableBody.appendChild(row);
      });
    } catch (err) {
      console.error('Error fetching trades:', err);
      tradesTableBody.innerHTML = `<tr><td colspan="6">Failed to load trades.</td></tr>`;
    }
  }

  // Fetch Top-Up History (latest first & highlight new top-ups)
  async function fetchTopups() {
    try {
      const res = await fetch('/api/topups');
      if (!res.ok) throw new Error('Failed to fetch top-ups');
      let data = await res.json();

      // Sort by ID descending (latest first)
      data.sort((a, b) => b.id - a.id);

      topupTableBody.innerHTML = '';
      data.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${entry.id}</td>
          <td>${entry.username}</td>
          <td>${entry.amount}</td>
          <td>${entry.admin}</td>
          <td>${entry.date}</td>
        `;
        // Highlight if new top-up
        if (entry.id > lastTopupId) {
          row.style.backgroundColor = '#d4edda'; // light green
          setTimeout(() => { row.style.transition = 'background-color 2s'; row.style.backgroundColor = ''; }, 2000);
        }
        topupTableBody.appendChild(row);
      });

      if (data.length > 0) lastTopupId = data[0].id; // Update last top-up ID
    } catch (err) {
      console.error('Error fetching top-ups:', err);
      topupTableBody.innerHTML = `<tr><td colspan="5">Failed to load top-up history.</td></tr>`;
    }
  }

  // Top-Up User
  window.topUpUser = async (userId, username) => {
    const amount = prompt(`Enter amount to top up for ${username}:`);
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return alert('Invalid amount. Please enter a number greater than 0.');
    }

    if (!confirm(`Are you sure you want to top up $${amount} to ${username}?`)) return;

    try {
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: Number(amount) })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Top up successful! $${amount} added to ${username}.`);
        fetchUsers();
        fetchTopups(); // Refresh top-up history
      } else {
        alert('Top up failed: ' + data.message);
      }
    } catch (err) {
      console.error('Error topping up user:', err);
      alert('An error occurred. Please try again.');
    }
  };

  // Initialize Dashboard
  function initDashboard() {
    fetchUsers();
    fetchTrades();
    fetchTopups();
  }

  // Auto-refresh all tables every 30 seconds safely
  setInterval(() => {
    fetchUsers();
    fetchTrades();
    fetchTopups();
  }, 30000);

  initDashboard();
});
