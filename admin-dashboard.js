(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  window.addEventListener('DOMContentLoaded', async () => {
    if (!API.Token.exists()) { window.location.href = 'auth.html'; return; }
    const user = API.User.get();
    if (!user || user.role !== 'admin') {
      alert('Unauthorized. Admin access only.');
      window.location.href = 'student-dashboard.html';
      return;
    }
    loadOverviewStats();
  });

  // 1. Tab Switching
  window.switchTab = function(tabId) {
    ['overview', 'ingest', 'review', 'flags', 'users'].forEach(t => {
      $(`tab-${t}`).classList.add('hidden');
      $(`nav-${t}`).classList.remove('active');
    });
    $(`tab-${tabId}`).classList.remove('hidden');
    $(`nav-${tabId}`).classList.add('active');

    if (tabId === 'review') loadPendingReview();
    if (tabId === 'flags') loadFlags();
    if (tabId === 'users') loadUsers(); // <-- Naya
  };

  // 2. Ingest Paper
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
        questions: questions
      };
      btn.disabled = true; btn.textContent = 'Ingesting...';
      const res = await API.request('/api/tests/papers/ingest', { method: 'POST', body: payload });
      showToast(`✅ Paper Ingested: ${res.paper.paperCode}`);
      $('ingestForm').reset();
    } catch (err) {
      alert('❌ Error: ' + (err.message || 'Check JSON format'));
    } finally {
      btn.disabled = false; btn.textContent = '🚀 Ingest Paper';
    }
  };

  // 3. Load Review
  async function loadPendingReview() {
    const list = $('reviewList');
    try {
      const res = await API.request('/api/tests/papers/pending-review');
      const papers = res.papers || [];
      if (papers.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-500 font-semibold">No pending reviews. All clear!</p>';
        return;
      }
      list.innerHTML = papers.map(p => `
        <div class="neu-inner p-6 rounded-2xl flex flex-col gap-4" id="review-item-${p._id}">
          <div class="flex justify-between items-center">
            <span class="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold tracking-wider">${p.matchStats.pendingReviewCount} PENDING</span>
            <span class="text-xs font-semibold text-slate-500">${p.paperCode}</span>
          </div>
          <div class="flex gap-4 justify-end mt-2">
            <button onclick="reviewAction('${p._id}', 'reject')" class="neu-btn neu-btn-red px-6 py-3 text-xs">Reject</button>
            <button onclick="reviewAction('${p._id}', 'approve')" class="neu-btn neu-btn-green px-6 py-3 text-xs">Approve All</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = `<p class="text-sm text-red-500 font-semibold">Error: ${err.message}</p>`;
    }
  }

  window.reviewAction = async function(paperId, action) {
    try {
      await API.request(`/api/tests/papers/${paperId}/review-match`, {
        method: 'POST', body: { questionNumber: 1, action: action }
      });
      $(`review-item-${paperId}`).remove();
      showToast(action === 'approve' ? 'Paper Approved' : 'Match Rejected');
    } catch (err) { alert('Error: ' + err.message); }
  };

  // 4. Load Flags
  async function loadFlags() {
    const list = $('flagsList');
    try {
      const res = await API.request('/api/admin/flags');
      const flags = res.flags || [];
      if (flags.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-500 font-semibold">No reported questions. Great job!</p>';
        return;
      }
      list.innerHTML = flags.map(f => `
        <div class="neu-inner p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6" id="flag-item-${f._id}">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <span class="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-bold tracking-wider">🚩 ${f.reason || 'Report'}</span>
            </div>
            <p class="text-sm font-bold text-slate-800">${f.questionId?.questionText || 'Unknown Question'}</p>
          </div>
          <div class="flex gap-4 w-full sm:w-auto">
            <button onclick="resolveFlag('${f._id}', 'reject')" class="neu-btn flex-1 sm:flex-none px-6 py-3 text-xs">Dismiss</button>
            <button onclick="resolveFlag('${f._id}', 'approve')" class="neu-btn neu-btn-red flex-1 sm:flex-none px-6 py-3 text-xs">Disable Q</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = `<p class="text-sm text-red-500 font-semibold">Error: ${err.message}</p>`;
    }
  }

  window.resolveFlag = async function(flagId, action) {
    try {
      await API.request(`/api/admin/flags/${flagId}/resolve`, {
        method: 'POST', body: { action: action === 'approve' ? 'approve' : 'reject' }
      });
      $(`flag-item-${flagId}`).remove();
      showToast(action === 'approve' ? 'Question Disabled' : 'Flag Dismissed');
    } catch (err) { alert('Error: ' + err.message); }
  };

  // 5. MANAGE USERS (Plan B)
  async function loadUsers() {
    const list = $('usersList');
    list.innerHTML = '<p class="text-sm text-slate-500">Loading users...</p>';
    
    try {
      const res = await API.request('/api/admin/users');
      const users = res.users || [];
      
      if (users.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-500 font-semibold">No students found.</p>';
        return;
      }

      list.innerHTML = users.map(u => `
        <div class="neu-inner p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="user-item-${u._id}">
          <div>
            <p class="text-sm font-bold text-slate-800">${u.name}</p>
            <p class="text-xs text-slate-500">${u.email}</p>
          </div>
          <button onclick="promoteUser('${u._id}', '${u.name}')" class="neu-btn px-5 py-2.5 text-xs text-blue-600 w-full sm:w-auto">
            Make Admin
          </button>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = `<p class="text-sm text-red-500 font-semibold">Error: ${err.message}</p>`;
    }
  }

  window.promoteUser = async function(userId, name) {
    if (!confirm(`Are you sure you want to make ${name} an Admin?`)) return;
    
    try {
      await API.request(`/api/admin/users/${userId}/promote`, { method: 'PUT' });
      document.getElementById(`user-item-${userId}`).remove();
      showToast(`✅ ${name} is now an Admin!`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  async function loadOverviewStats() {
    $('statTotalPapers').textContent = '142';
    $('statPending').textContent = '3';
  }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity = '0';
    }, 3000);
  }

})();
