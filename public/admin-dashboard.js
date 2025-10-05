// ==========================
// TradeSphere Admin Dashboard JS (Full Version with Real-Time Support Chat + NFT Management)
// ==========================

const usersTableBody = document.querySelector('#usersTable tbody');
const withdrawalsTableBody = document.querySelector('#withdrawalsTable tbody');
const investmentsTableBody = document.querySelector('#investmentsTable tbody');
const topupTableBody = document.querySelector('#topupTable tbody');
const nftsTableBody = document.querySelector('#nftsTable tbody');
const nftAssignmentsTableBody = document.querySelector('#nftAssignmentsTable tbody');

const userAlert = document.getElementById('userAlert');
const withdrawalAlert = document.getElementById('withdrawalAlert');
const investmentAlert = document.getElementById('investmentAlert');
const nftAlert = document.getElementById('nftAlert');

const adminId = localStorage.getItem('userId');
const adminRole = localStorage.getItem('role');

if (!adminId || adminId === 'null' || adminId === 'undefined' || !adminRole || adminRole !== 'admin') {
  alert('Access denied! Admin login required.');
  localStorage.clear();
  window.location.href = 'admin.html';
}

function showAlert(element, message, isSuccess = true) {
  if (!element) return;
  element.textContent = message;
  element.className = `alert ${isSuccess ? 'success' : 'error'}`;
  element.style.display = 'block';
  setTimeout(() => { element.style.display = 'none'; }, 3000);
}

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
          <td><button onclick="manageUserNFTs('${userId}', '${username}')">NFTs</button></td>
          <td><button class="delete-btn" onclick="deleteUser('${userId}', '${username}')">Delete</button></td>
        `;
        usersTableBody.appendChild(row);
      });
    } else {
      usersTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No users found</td></tr>`;
    }
  } catch (err) {
    showAlert(userAlert, 'Error fetching users', false);
    console.error(err);
  }
}

async function deleteUser(userId, username) {
  const confirm = window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone and will delete all their data (withdrawals, investments, messages).`);
  if (!confirm) return;

  try {
    const res = await fetch('/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    showAlert(userAlert, data.message || 'User deleted', data.success);
    if (data.success) {
      fetchUsers();
      fetchInvestments();
      fetchWithdrawals();
      fetchTopups();
    }
  } catch (err) {
    showAlert(userAlert, 'Delete failed', false);
    console.error(err);
  }
}

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
    fetchInvestments();
    fetchTopups();
  } catch (err) {
    showAlert(userAlert, 'Top-up failed', false);
    console.error(err);
  }
}

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
    fetchTopups();
  } catch (err) {
    showAlert(userAlert, 'Reduction failed', false);
    console.error(err);
  }
}

async function fetchWithdrawals() {
  try {
    const res = await fetch('/admin/withdrawals', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    
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
  } catch (err) {
    console.error('Error fetching withdrawals:', err);
  }
}

async function approveWithdrawal(withdrawalId) {
  try {
    const res = await fetch('/admin/withdrawals/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ withdrawalId })
    });
    const data = await res.json();
    showAlert(withdrawalAlert, data.message || 'Withdrawal approved', data.success);
    fetchWithdrawals();
  } catch (err) {
    showAlert(withdrawalAlert, 'Approval failed', false);
    console.error(err);
  }
}

async function fetchInvestments() {
  try {
    const res = await fetch('/admin/investments', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    
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
  } catch (err) {
    console.error('Error fetching investments:', err);
  }
}

async function fetchTopups() {
  try {
    const res = await fetch('/admin/topups', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    
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
  } catch (err) {
    console.error('Error fetching topups:', err);
  }
}

async function fetchNFTs() {
  try {
    const res = await fetch('/admin/nfts', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    
    if (!nftsTableBody) return;
    
    nftsTableBody.innerHTML = '';

    if (data.success && Array.isArray(data.nfts) && data.nfts.length) {
      data.nfts.forEach(nft => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><img src="${nft.image_url}" alt="${nft.title}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;"></td>
          <td>${nft.title}</td>
          <td>${nft.description || '-'}</td>
          <td>${nft.collection_name || '-'}</td>
          <td>${nft.blockchain || '-'}</td>
          <td>${new Date(nft.created_at).toLocaleDateString()}</td>
          <td>
            <button onclick="deleteNFT(${nft.id}, '${nft.title.replace(/'/g, "\\'")}')">Delete</button>
          </td>
        `;
        nftsTableBody.appendChild(row);
      });
    } else {
      nftsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No NFTs created yet</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching NFTs:', err);
  }
}

async function createNFT() {
  const title = prompt("Enter NFT Title:");
  if (!title) return;
  
  const description = prompt("Enter NFT Description:");
  const imageUrl = prompt("Enter Image URL:");
  if (!imageUrl) return alert("Image URL is required!");
  
  const collectionName = prompt("Enter Collection Name (optional):");
  const blockchain = prompt("Enter Blockchain (optional, e.g., Ethereum, Polygon):");

  try {
    const res = await fetch('/admin/nfts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ title, description, imageUrl, collectionName, blockchain })
    });
    const data = await res.json();
    showAlert(nftAlert, data.message || 'NFT created!', data.success);
    if (data.success) fetchNFTs();
  } catch (err) {
    showAlert(nftAlert, 'Failed to create NFT', false);
    console.error(err);
  }
}

async function deleteNFT(nftId, title) {
  const confirm = window.confirm(`Delete NFT "${title}"? This will also remove it from all users.`);
  if (!confirm) return;

  try {
    const res = await fetch('/admin/nfts/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ nftId })
    });
    const data = await res.json();
    showAlert(nftAlert, data.message || 'NFT deleted', data.success);
    if (data.success) {
      fetchNFTs();
      fetchNFTAssignments();
    }
  } catch (err) {
    showAlert(nftAlert, 'Delete failed', false);
    console.error(err);
  }
}

async function manageUserNFTs(userId, username) {
  const action = prompt(`Manage NFTs for ${username}\nType 'assign' to add NFT or 'remove' to remove NFT:`);
  
  if (action === 'assign') {
    await assignNFTToUser(userId, username);
  } else if (action === 'remove') {
    await removeNFTFromUser(userId, username);
  } else {
    alert('Invalid action. Use "assign" or "remove"');
  }
}

async function assignNFTToUser(userId, username) {
  try {
    const res = await fetch('/admin/nfts', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    
    if (!data.success || !data.nfts.length) {
      return alert('No NFTs available. Create NFTs first!');
    }

    let nftList = "Available NFTs:\n";
    data.nfts.forEach((nft, index) => {
      nftList += `${index + 1}. ${nft.title} (ID: ${nft.id})\n`;
    });
    
    const nftId = prompt(nftList + "\nEnter NFT ID to assign:");
    if (!nftId) return;

    const assignRes = await fetch('/admin/nfts/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ nftId: Number(nftId), userId })
    });
    const assignData = await assignRes.json();
    showAlert(nftAlert, assignData.message, assignData.success);
    if (assignData.success) fetchNFTAssignments();
  } catch (err) {
    showAlert(nftAlert, 'Assignment failed', false);
    console.error(err);
  }
}

async function removeNFTFromUser(userId, username) {
  try {
    const res = await fetch(`/admin/users/${userId}/nfts`, { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    
    if (!data.success || !data.nfts.length) {
      return alert(`${username} has no NFTs assigned.`);
    }

    let nftList = `${username}'s NFTs:\n`;
    data.nfts.forEach((nft, index) => {
      nftList += `${index + 1}. ${nft.title} (ID: ${nft.id})\n`;
    });
    
    const nftId = prompt(nftList + "\nEnter NFT ID to remove:");
    if (!nftId) return;

    const removeRes = await fetch('/admin/nfts/unassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ nftId: Number(nftId), userId })
    });
    const removeData = await removeRes.json();
    showAlert(nftAlert, removeData.message, removeData.success);
    if (removeData.success) fetchNFTAssignments();
  } catch (err) {
    showAlert(nftAlert, 'Removal failed', false);
    console.error(err);
  }
}

async function fetchNFTAssignments() {
  try {
    const res = await fetch('/admin/nfts/assignments', { headers: { 'x-user-id': adminId } });
    const data = await res.json();
    
    if (!nftAssignmentsTableBody) return;
    
    nftAssignmentsTableBody.innerHTML = '';

    if (data.success && Array.isArray(data.assignments) && data.assignments.length) {
      data.assignments.forEach(assignment => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${assignment.username}</td>
          <td>${assignment.nft_title}</td>
          <td><img src="${assignment.image_url}" alt="${assignment.nft_title}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;"></td>
          <td>${new Date(assignment.assigned_at).toLocaleDateString()}</td>
          <td><button onclick="removeNFTFromUser(${assignment.user_id}, '${assignment.username}')">Remove</button></td>
        `;
        nftAssignmentsTableBody.appendChild(row);
      });
    } else {
      nftAssignmentsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No NFT assignments yet</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching NFT assignments:', err);
  }
}

document.getElementById('createNFTBtn')?.addEventListener('click', createNFT);

const supportChatWindow = document.getElementById('supportChatWindow');
const supportMessages = document.getElementById('supportMessages');
const supportMessageInput = document.getElementById('supportMessageInput');
const sendSupportMessageBtn = document.getElementById('sendSupportMessage');

let currentChatUserId = null;
let supportPollInterval = null;
let displayedMessageIds = new Set();

function openSupportChat(userId) {
  if (!userId || userId === 'undefined' || userId === 'null') {
    alert('Invalid user selected!');
    return;
  }
  
  currentChatUserId = userId;
  
  if (!supportChatWindow) {
    alert('Chat window element not found!');
    return;
  }
  
  supportChatWindow.style.display = 'flex';
  displayedMessageIds.clear();
  supportMessages.innerHTML = '<div style="color:#888;">Loading messages...</div>';
  fetchSupportMessages();

  if (supportPollInterval) clearInterval(supportPollInterval);
  supportPollInterval = setInterval(fetchSupportMessages, 1000);
}

async function fetchSupportMessages() {
  if (!currentChatUserId) return;
  try {
    const res = await fetch(`/admin/support/messages/${currentChatUserId}`, {
      headers: { 'x-user-id': adminId }
    });
    const data = await res.json();
    
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
  } catch (err) {
    console.error(err);
    supportMessages.innerHTML = `<div style="color:#888;">Failed to load messages.</div>`;
  }
}

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

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function refreshAll() {
  await fetchUsers();
  await fetchWithdrawals();
  await fetchInvestments();
  await fetchTopups();
  await fetchNFTs();
  await fetchNFTAssignments();
}
refreshAll();
setInterval(refreshAll, 5000);

document.getElementById('adminLogout')?.addEventListener('click', () => {
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
  window.location.href = 'admin.html';
});
