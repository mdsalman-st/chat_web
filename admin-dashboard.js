(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // =========================================
  // 1. THEME LOGIC (Adaptive + Manual Toggle)
  // =========================================
  function initTheme() {
    const savedTheme = localStorage.getItem('nexus_admin_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeBtn = $('themeBtn');

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.body.classList.add('dark-mode');
      if (themeBtn) themeBtn.textContent = '☀️';
    } else {
      document.body.classList.remove('dark-mode');
      if (themeBtn) themeBtn.textContent = '🌙';
    }
  }

  window.toggleTheme = function() {
    const body = document.body;
    const themeBtn = $('themeBtn');
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
      localStorage.setItem('nexus_admin_theme', 'dark');
      if (themeBtn) themeBtn.textContent = '☀️';
    } else {
      localStorage.setItem('nexus_admin_theme', 'light');
      if (themeBtn) themeBtn.textContent = '🌙';
    }
  };

  initTheme();

  // =========================================
  // 2. SECURITY & INITIALIZATION
  // =========================================
  window.addEventListener('DOMContentLoaded', async () => {
    if (!API.Token.exists()) { 
      window.location.href = 'auth.html'; 
      return; 
    }
    
    const user = API.User.get();
    const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin');
    
    if (!isAdmin) {
      alert('Unauthorized. Super Admin access only.');
      window.location.href = 'student-dashboard.html';
      return;
    }
    
    // Populate Profile Info
    if (user.email) {
      if ($('topEmail')) $('topEmail').textContent = user.email;
      if ($('profileEmail')) $('profileEmail').value = user.email;
    }
    if (user.name) {
      if ($('topAvatar')) $('topAvatar').textContent = user.name.charAt(0).toUpperCase();
      if ($('profileName')) $('profileName').value = user.name;
    }

    // Load initial stats on dashboard
    loadOverviewStats();
  });

  // =========================================
  // 3. TAB SWITCHING LOGIC
  // =========================================
  const tabTitles = {
    'overview': 'Dashboard Overview', 
    'users': 'Manage Users & Roles', 
    'boards': 'Boards & Subjects',
    'question-bank': 'Question Bank Management', 
    'ingest': 'Ingest Official Paper',
    'review': 'AI Question Review', 
    'ai-health': 'AI & System Health', 
    'broadcast': 'Broadcast Notifications', 
    'audit': 'System Audit Logs', 
    'profile': 'Admin Settings'
  };

  window.switchTab = function(tabId) {
    // Hide all tabs
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    // Remove active state from all nav buttons
    document.querySelectorAll('[id^="nav-"]').forEach(el => el.classList.remove('active'));
    
    // Show selected tab and set active state
    if ($(`tab-${tabId}`)) $(`tab-${tabId}`).classList.remove('hidden');
    if ($(`nav-${tabId}`)) $(`nav-${tabId}`).classList.add('active');
    if ($('page-title') && tabTitles[tabId]) $('page-title').textContent = tabTitles[tabId];

    // Fetch dynamic data based on selected tab
    if (tabId === 'overview') loadOverviewStats();
    if (tabId === 'review') loadPendingReview();
    if (tabId === 'users') loadUsers();
    if (tabId === 'boards') loadBoards();
    if (tabId === 'question-bank') loadQuestionBank();
  };

  // =========================================
  // 4. OVERVIEW STATS (Real Data)
  // =========================================
  async function loadOverviewStats() {
    try {
      const res = await API.request('/api/admin/stats');
      if (res.success && res.stats) {
        if ($('statTotalStudents')) $('statTotalStudents').textContent = res.stats.totalStudents || '0';
        if ($('statSubjectAdmins')) $('statSubjectAdmins').textContent = res.stats.totalSubjectAdmins || '0';
        if ($('statTotalPapers')) $('statTotalPapers').textContent = res.stats.totalPapers || '0';
        if ($('statAiJobs')) $('statAiJobs').textContent = res.stats.activeAiJobs || '0';
      }
    } catch (err) {
      console.warn('Stats load error:', err);
      // Fallback if API fails
      ['statTotalStudents', 'statSubjectAdmins', 'statTotalPapers', 'statAiJobs'].forEach(id => {
        if ($(id)) $(id).textContent = '0';
      });
    }
  }

  // =========================================
  // 5. MANAGE USERS (RBAC)
  // =========================================
  async function loadUsers() {
    const list = $('usersList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-slate-500">Loading users...</p>';
    
    try {
      const res = await API.request('/api/admin/users');
      const users = res.users || [];
      
      if (users.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-500 font-semibold">No users found.</p>';
        return;
      }

      list.innerHTML = users.map(u => {
        const isSubjectAdmin = u.role === 'subject_admin';
        
        const roleBadge = isSubjectAdmin 
          ? `<span class="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">ADMIN (${u.assignedSubject ? u.assignedSubject.toUpperCase() : 'ALL'})</span>`
          : `<span class="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">STUDENT</span>`;
        
        const actionBtn = isSubjectAdmin
          ? `<button onclick="revokeAdmin('${u._id}')" class="neu-btn px-4 py-2 text-xs text-red-500">Revoke Access</button>`
          : `<button onclick="promoteUser('${u._id}')" class="neu-btn px-4 py-2 text-xs text-blue-600">Make Subject Admin</button>`;

        return `
          <div class="neu-inner p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="user-item-${u._id}">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-600">${u.name.charAt(0).toUpperCase()}</div>
              <div>
                <p class="text-sm font-bold text-slate-800">${u.name}</p>
                <p class="text-xs text-slate-500">${u.email}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 w-full sm:w-auto">
              ${roleBadge}
              ${actionBtn}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      list.innerHTML = `<p class="text-sm text-red-500 font-semibold">Error loading users: ${err.message}</p>`;
    }
  }

  window.promoteUser = async function(userId) {
    const subject = prompt("Enter Subject Code for this Admin (e.g. eco, acc, sci):");
    if (!subject) return;
    
    try {
      await API.request(`/api/admin/users/${userId}/promote`, { 
        method: 'PUT', 
        body: { assignedSubject: subject.trim().toLowerCase() } 
      });
      showToast(`✅ Promoted to ${subject.toUpperCase()} Admin`);
      loadUsers(); // Reload list
    } catch (err) { 
      alert('Error promoting user: ' + err.message); 
    }
  };

  window.revokeAdmin = async function(userId) {
    if (!confirm('Are you sure you want to revoke Admin access for this user?')) return;
    
    try {
      await API.request(`/api/admin/users/${userId}/revoke`, { method: 'PUT' });
      showToast('✅ Access Revoked Successfully');
      loadUsers();
    } catch (err) { 
      alert('Error revoking access: ' + err.message); 
    }
  };

  // =========================================
  // 6. BOARDS & SUBJECTS
  // =========================================
  window.handleAddBoard = async function(e) {
    e.preventDefault();
    try {
      const payload = {
        code: $('boardCode').value.trim().toLowerCase(),
        name: $('boardName').value.trim(),
        shortName: $('boardShortName').value.trim() || $('boardName').value.trim()
      };
      
      const res = await API.request('/api/admin/boards', { method: 'POST', body: payload });
      showToast(`✅ Board Added: ${res.board.shortName}`);
      e.target.reset();
      loadBoards(); // Refresh list
    } catch (err) { 
      alert('❌ Error adding board: ' + err.message); 
    }
  };

  async function loadBoards() {
    const list = $('boardList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-slate-500">Loading boards...</p>';
    
    try {
      // Using existing public route to fetch boards
      const res = await API.request('/api/tests/boards'); 
      const boards = res.boards || [];
      
      list.innerHTML = boards.map(b => `
        <div class="neu-inner p-4 rounded-xl flex justify-between items-center">
          <div>
            <p class="text-sm font-bold text-slate-800">${b.shortName}</p>
            <p class="text-xs text-slate-500">${b.name}</p>
          </div>
        </div>
      `).join('');
    } catch (err) { 
      list.innerHTML = `<p class="text-sm text-red-500">Error loading boards: ${err.message}</p>`; 
    }
  }

  // =========================================
  // 7. QUESTION BANK (Mocked UI for now)
  // =========================================
  async function loadQuestionBank() {
    const list = $('questionBankList');
    if (!list) return;
    
    // Placeholder until backend API for Question Bank is built
    list.innerHTML = `
      <div class="neu-inner p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span class="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-md">VERIFIED</span>
          <p class="text-sm font-bold text-slate-800 mt-2">What is the formula for calculating goodwill?</p>
          <p class="text-xs text-slate-500 mt-1">Subject: Accountancy • Class 12</p>
        </div>
        <div class="flex gap-2">
          <button class="neu-btn px-4 py-2 text-xs text-blue-500">Edit</button>
          <button class="neu-btn px-4 py-2 text-xs text-red-500">Delete</button>
        </div>
      </div>
    `;
  }

  // =========================================
  // 8. INGEST PAPER (URL Fixed)
  // =========================================
  window.handleIngestPaper = async function(e) {
    e.preventDefault();
    const btn = $('ingestBtn');
    
    try {
      const questions = JSON.parse($('ingestQuestions').value);
      const payload = {
        boardCode: $('ingestBoard').value, 
        classLevel: $('ingestClass').value,
        subjectCode: $('ingestSubjectCode').value.trim(), 
        subjectName: $('ingestSubjectName').value.trim(),
        year: Number($('ingestYear').value), 
        examPhase: $('ingestPhase').value, 
        questions
      };
      
      btn.disabled = true; 
      btn.textContent = 'Ingesting...';
      
      // FIXED URL: Pointing to the correct admin paper route
      const res = await API.request('/api/admin/papers/ingest', { method: 'POST', body: payload });
      
      showToast(`✅ Paper Ingested: ${res.paper.paperCode}`);
      $('ingestForm').reset();
    } catch (err) { 
      alert('❌ Error ingesting paper: ' + (err.message || 'Check JSON format')); 
    } finally { 
      btn.disabled = false; 
      btn.textContent = '🚀 Ingest Paper'; 
    }
  };

  // =========================================
  // 9. REVIEW QUEUE (URL Fixed to resolve 500 error)
  // =========================================
  async function loadPendingReview() {
    const list = $('reviewList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-slate-500">Loading pending papers...</p>';
    
    try {
      // FIXED URL: Pointing to admin route, not tests route
      const res = await API.request('/api/admin/papers/pending-review');
      const papers = res.papers || [];
      
      if (papers.length === 0) { 
        list.innerHTML = '<p class="text-sm text-slate-500 font-semibold">No pending reviews. All clear!</p>'; 
        return; 
      }
      
      list.innerHTML = papers.map(p => `
        <div class="neu-inner p-6 rounded-2xl flex flex-col gap-4" id="review-item-${p._id}">
          <div class="flex justify-between items-center">
            <span class="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">${p.matchStats.pendingReviewCount} PENDING</span>
            <span class="text-xs font-semibold text-slate-500">${p.paperCode}</span>
          </div>
          <div class="flex gap-4 justify-end mt-2">
            <button onclick="reviewAction('${p._id}', 'reject')" class="neu-btn text-red-500 px-6 py-3 text-xs">Reject</button>
            <button onclick="reviewAction('${p._id}', 'approve')" class="neu-btn text-green-500 px-6 py-3 text-xs">Approve</button>
          </div>
        </div>
      `).join('');
    } catch (err) { 
      list.innerHTML = `<p class="text-sm text-red-500">Error loading review queue: ${err.message}</p>`; 
    }
  }

  window.reviewAction = async function(paperId, action) {
    try {
      // FIXED URL: Pointing to admin route review endpoint
      await API.request(`/api/admin/papers/${paperId}/review`, { 
        method: 'POST', 
        body: { questionNumber: 1, action } 
      });
      
      if ($(`review-item-${paperId}`)) $(`review-item-${paperId}`).remove();
      showToast(action === 'approve' ? 'Paper Approved' : 'Match Rejected');
    } catch (err) { 
      alert('Error reviewing match: ' + err.message); 
    }
  };

  // =========================================
  // 10. UTILS
  // =========================================
  function showToast(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.transform = 'translateY(0)'; 
    toast.style.opacity = '1';
    setTimeout(() => { 
      toast.style.transform = 'translateY(20px)'; 
      toast.style.opacity = '0'; 
    }, 3000);
  }

  window.handleLogout = function() {
    if (confirm('Sign out?')) { 
      API.Token.remove(); 
      window.location.href = 'index.html'; 
    }
  };

})();