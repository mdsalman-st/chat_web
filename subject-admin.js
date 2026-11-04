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
    'ingest': 'Ingest Official Paper',
    'my-papers': 'My Uploaded Papers',
    'review': 'AI Question Review',
    'flags': 'Reported Questions',
    'profile': 'Teacher Profile Settings'
  };

  window.switchTab = function(tabId) {
    ['overview', 'manage-qs', 'materials', 'ingest', 'my-papers', 'review', 'flags', 'profile'].forEach(t => {
      if ($(`tab-${t}`)) $(`tab-${t}`).classList.add('hidden');
      if ($(`nav-${t}`)) $(`nav-${t}`).classList.remove('active');
    });
    
    if ($(`tab-${tabId}`)) $(`tab-${tabId}`).classList.remove('hidden');
    if ($(`nav-${tabId}`)) $(`nav-${tabId}`).classList.add('active');
    if ($('page-title') && tabTitles[tabId]) $('page-title').textContent = tabTitles[tabId];

    if (tabId === 'review') loadPendingReview();
    if (tabId === 'flags') loadFlags();
    if (tabId === 'my-papers') loadMyPapers();
    if (tabId === 'manage-qs') loadQuestions();
  };

  // =========================================
  // PDF UPLOAD LOGIC FOR SUBJECT ADMIN
  // =========================================
  window.handleAdminPdfUpload = async function(e) {
    e.preventDefault();
    
    const btn = $('ingestBtn');
    const originalText = btn.innerText;
    const fileInput = $('ingestPdf');

    if (!fileInput || !fileInput.files.length) {
      alert('Please select a PDF file first.');
      return;
    }

    btn.innerText = '⏳ Uploading...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('pdf', fileInput.files[0]);
    formData.append('boardCode', $('ingestBoard').value);
    formData.append('classLevel', $('ingestClass').value);
    formData.append('subjectCode', $('ingestSubjectCode').value.trim());
    formData.append('subjectName', $('ingestSubjectName').value.trim());
    formData.append('year', $('ingestYear').value);
    formData.append('examPhase', $('ingestPhase').value);

    try {
      // 👇 YAHAN API.JS WALA FUNCTION USE KIYA HAI 👇
      const data = await API.admin.uploadPaper(formData, false);

      showToast('✅ Paper uploaded successfully! AI is extracting text.');
      $('ingestForm').reset(); 
      loadMyPapers(); 

    } catch (error) {
      console.error(error);
      alert(`❌ Upload Error: ${error.message}`);
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  };

  // =========================================
  // LOAD MY PAPERS LIST
  // =========================================
  async function loadMyPapers() {
    const list = $('myPapersList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-slate-400">Loading...</p>';

    try {
      const res = await API.request('/api/admin/papers');
      const papers = res.papers || [];
      
      if (!papers.length) {
        list.innerHTML = '<p class="text-sm text-slate-400">No papers uploaded yet.</p>';
        return;
      }

      list.innerHTML = papers.map(p => {
        const date = new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const statusColor = p.status === 'ingested' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        
        return `
          <div class="glass-inner p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColor}">${p.status}</span>
                <span class="text-xs text-slate-400 font-mono">${p.paperCode || 'N/A'}</span>
              </div>
              <p class="text-sm font-bold text-white">${p.subjectName} - ${p.boardCode.toUpperCase()} Class ${p.classLevel} (${p.year})</p>
              <p class="text-xs text-slate-400 mt-1">Uploaded on ${date} • Size: ${(p.fileSize / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div class="flex gap-2 w-full sm:w-auto">
              <a href="${p.fileUrl}" target="_blank" class="px-4 py-2 glass-inner text-xs font-bold text-cyan-400 text-center flex-1 sm:flex-none">View PDF</a>
              <button onclick="deletePaper('${p._id}')" class="px-4 py-2 bg-red-500/10 text-xs font-bold text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition flex-1 sm:flex-none">Delete</button>
            </div>
          </div>
        `;
      }).join('');
      
    } catch (err) {
      list.innerHTML = `<p class="text-sm text-red-500">Error loading papers: ${err.message}</p>`;
    }
  }

  window.deletePaper = async function(id) {
    if (!confirm('Are you sure you want to delete this paper? This action cannot be undone.')) return;
    
    try {
      await API.request(`/api/admin/papers/${id}`, { method: 'DELETE' });
      showToast('✅ Paper deleted successfully');
      loadMyPapers(); 
    } catch (err) {
      alert('❌ Error deleting paper: ' + err.message);
    }
  };

  // =========================================
  // MANAGE QUESTIONS (LIVE DATA)
  // =========================================
  async function loadQuestions() {
    const list = $('manageQuestionsList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-slate-400">Loading questions...</p>';
    
    try {
      const res = await API.request('/api/admin/questions');
      const questions = res.questions || [];
      
      if (questions.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-400">No questions found for your subject. Generate some using AI first!</p>';
        return;
      }

      list.innerHTML = questions.map(q => `
        <div class="glass-inner p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold rounded-md uppercase">${q.status || 'VERIFIED'}</span>
              <span class="text-[10px] font-bold text-slate-400">${q.difficulty || 'Medium'}</span>
            </div>
            <p class="text-sm font-bold text-white mb-1">${q.questionText}</p>
            <p class="text-xs text-slate-400">Class ${q.classLevel} • Chapter ${q.chapterNumber} • ${q.subjectCode.toUpperCase()}</p>
          </div>
          <div class="flex gap-2 w-full sm:w-auto">
            <button onclick="deleteSubjectQuestion('${q._id}')" class="px-4 py-2 bg-red-500/10 text-xs font-bold text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 w-full sm:w-auto">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = `<p class="text-sm text-red-500">Error loading questions: ${err.message}</p>`;
    }
  }

  window.deleteSubjectQuestion = async function(id) {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await API.request(`/api/admin/questions/${id}`, { method: 'DELETE' });
      showToast('✅ Question deleted successfully');
      loadQuestions();
    } catch (err) {
      alert('❌ Error deleting question: ' + err.message);
    }
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
    if(!toast) return;
    toast.textContent = message;
    toast.style.transform = 'translateY(0)'; toast.style.opacity = '1';
    setTimeout(() => { toast.style.transform = 'translateY(20px)'; toast.style.opacity = '0'; }, 3000);
  }

  window.handleLogout = function() {
    if (confirm('Sign out?')) { API.Token.remove(); window.location.href = 'index.html'; }
  };
})();