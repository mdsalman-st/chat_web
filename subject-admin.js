(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // THEME LOGIC
  function initTheme() {
    const savedTheme = localStorage.getItem('nexus_admin_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeBtn = $('themeBtn');

    if (savedTheme === 'light' || (!savedTheme && !systemPrefersDark)) {
      document.body.classList.remove('dark-mode'); 
      if (themeBtn) themeBtn.textContent = '🌙';
    } else {
      document.body.classList.add('dark-mode');
      if (themeBtn) themeBtn.textContent = '☀️';
    }
  }

  window.toggleTheme = function() {
    const themeBtn = $('themeBtn');
    if (themeBtn.textContent === '🌙') {
      themeBtn.textContent = '☀️';
      document.body.style.background = '#eef2f6';
      document.body.style.color = '#0f172a';
    } else {
      themeBtn.textContent = '🌙';
      document.body.style.background = '#05070d';
      document.body.style.color = '#f8fafc';
    }
  };

  // SECURITY & INITIALIZATION
  window.addEventListener('DOMContentLoaded', async () => {
    if (!API.Token.exists()) { window.location.href = 'auth.html'; return; }
    
    const user = API.User.get();
    
    if (!user || (user.role !== 'subject_admin' && user.role !== 'super_admin')) {
      alert('Unauthorized. Teacher access only.');
      window.location.href = 'student-dashboard.html';
      return;
    }

    if (user.email) {
      $('topEmail').textContent = user.email;
      $('profileEmail').value = user.email;
    }
    if (user.name) {
      $('topAvatar').textContent = user.name.charAt(0).toUpperCase();
    }
    if (user.assignedSubject) {
      $('adminSubjectName').textContent = `${user.assignedSubject.toUpperCase()} Admin`;
    }
  });

  // TABS
  const tabTitles = {
    'overview': 'Subject Overview',
    'manage-qs': 'Manage Questions',
    'materials': 'Books & Notes',
    'review': 'AI Question Review',
    'flags': 'Reported Questions',
    'profile': 'Teacher Profile Settings'
  };

  window.switchTab = function(tabId) {
    ['overview', 'manage-qs', 'materials', 'review', 'flags', 'profile'].forEach(t => {
      if ($(`tab-${t}`)) $(`tab-${t}`).classList.add('hidden');
      if ($(`nav-${t}`)) $(`nav-${t}`).classList.remove('active');
    });
    
    if ($(`tab-${tabId}`)) $(`tab-${tabId}`).classList.remove('hidden');
    if ($(`nav-${tabId}`)) $(`nav-${tabId}`).classList.add('active');
    if ($('page-title')) $('page-title').textContent = tabTitles[tabId];

    if (tabId === 'review') loadPendingReview();
    if (tabId === 'flags') loadFlags();
  };

  // MOCK FUNCTIONS FOR NEW FEATURES
  window.openAddQuestionModal = function() {
    showToast('Add Question Modal Opening... (Backend needed)');
  };

  // AI REVIEW
  async function loadPendingReview() {
    const list = $('reviewList');
    list.innerHTML = '<p class="text-sm text-slate-400">Loading...</p>';
    try {
      const res = await API.request('/api/tests/papers/pending-review');
      const papers = res.papers || [];
      if (!papers.length) { list.innerHTML = '<p class="text-sm text-slate-400">No pending reviews for your subject.</p>'; return; }
      
      list.innerHTML = papers.map(p => `
        <div class="glass-inner p-6 rounded-2xl flex flex-col gap-4" id="review-item-${p._id}">
          <div class="flex justify-between items-center">
            <span class="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-bold">${p.matchStats.pendingReviewCount} PENDING</span>
            <span class="text-xs font-semibold text-slate-400">${p.paperCode}</span>
          </div>
          <div class="flex gap-4 justify-end mt-2">
            <button onclick="reviewAction('${p._id}', 'reject')" class="px-6 py-3 glass-inner text-red-400 text-xs font-bold hover:bg-red-500/20">Reject</button>
            <button onclick="reviewAction('${p._id}', 'approve')" class="px-6 py-3 bg-white text-black text-xs font-bold hover:scale-105 transition">Approve</button>
          </div>
        </div>
      `).join('');
    } catch (err) { list.innerHTML = `<p class="text-sm text-red-500">Error: ${err.message}</p>`; }
  }

  window.reviewAction = async function(paperId, action) {
    try {
      await API.request(`/api/tests/papers/${paperId}/review-match`, { method: 'POST', body: { questionNumber: 1, action } });
      if ($(`review-item-${paperId}`)) $(`review-item-${paperId}`).remove();
      showToast(action === 'approve' ? 'Approved' : 'Rejected');
    } catch (err) { alert(err.message); }
  };

  // FLAGS
  async function loadFlags() {
    const list = $('flagsList');
    list.innerHTML = '<p class="text-sm text-slate-400">Loading...</p>';
    try {
      const res = await API.request('/api/admin/flags');
      const flags = res.flags || [];
      if (!flags.length) { list.innerHTML = '<p class="text-sm text-slate-400">No reports for your subject.</p>'; return; }
      
      list.innerHTML = flags.map(f => `
        <div class="glass-inner p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6" id="flag-item-${f._id}">
          <div>
            <span class="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[10px] font-bold">🚩 ${f.reason || 'Report'}</span>
            <p class="text-sm font-bold text-white mt-2">${f.questionId?.questionText || 'Unknown'}</p>
          </div>
          <div class="flex gap-4 w-full sm:w-auto">
            <button onclick="resolveFlag('${f._id}', 'reject')" class="glass-inner px-6 py-3 text-xs font-bold">Dismiss</button>
            <button onclick="resolveFlag('${f._id}', 'approve')" class="px-6 py-3 bg-red-500 text-white text-xs font-bold hover:scale-105 transition">Disable Q</button>
          </div>
        </div>
      `).join('');
    } catch (err) { list.innerHTML = `<p class="text-sm text-red-500">Error: ${err.message}</p>`; }
  }

  window.resolveFlag = async function(flagId, action) {
    try {
      await API.request(`/api/admin/flags/${flagId}/resolve`, { method: 'POST', body: { action: action === 'approve' ? 'approve' : 'reject' } });
      if ($(`flag-item-${flagId}`)) $(`flag-item-${flagId}`).remove();
      showToast(action === 'approve' ? 'Question Disabled' : 'Flag Dismissed');
    } catch (err) { alert(err.message); }
  };

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.style.transform = 'translateY(0)'; toast.style.opacity = '1';
    setTimeout(() => { toast.style.transform = 'translateY(20px)'; toast.style.opacity = '0'; }, 3000);
  }

  window.handleLogout = function() {
    if (confirm('Sign out?')) { API.Token.remove(); window.location.href = 'index.html'; }
  };
})();