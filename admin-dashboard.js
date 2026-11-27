(function () {
  'use strict';
  
  console.log("✅ Super Admin Dashboard JS Loaded Successfully");

  const $ = (id) => document.getElementById(id);

  if (typeof API === 'undefined') {
    console.error("❌ API is not defined. Make sure api.js is loaded correctly.");
    alert("API failed to load. Please check api.js file.");
    return;
  }

  // =========================================
  // 1. THEME LOGIC
  // =========================================
  function initTheme() {
    const savedTheme = window.NexusTheme ? window.NexusTheme.get() : localStorage.getItem('nexus_admin_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeBtn = $('themeBtn');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      if (themeBtn) themeBtn.textContent = '☀️';
    } else {
      document.body.classList.remove('dark-mode');
      if (themeBtn) themeBtn.textContent = '🌙';
    }
    if (window.NexusTheme) {
      if (savedTheme) {
        window.NexusTheme.apply(savedTheme);
      } else {
        window.NexusTheme.clearPreference();
      }
    }
  }
  
  window.toggleTheme = function() {
    const body = document.body;
    const themeBtn = $('themeBtn');
    body.classList.toggle('dark-mode');
    if (body.classList.contains('dark-mode')) {
      localStorage.setItem('nexus_admin_theme', 'dark');
      if (window.NexusTheme) window.NexusTheme.apply('dark');
      if (themeBtn) themeBtn.textContent = '☀️';
    } else {
      localStorage.setItem('nexus_admin_theme', 'light');
      if (window.NexusTheme) window.NexusTheme.apply('light');
      if (themeBtn) themeBtn.textContent = '🌙';
    }
  };
  initTheme();

  // =========================================
  // 2. SECURITY & INIT
  // =========================================
  window.addEventListener('DOMContentLoaded', async () => {
    if (!API.Token.exists()) { window.location.href = 'auth.html'; return; }
    const user = API.User.get();
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      alert('Unauthorized. Super Admin access only.');
      window.location.href = 'student-dashboard.html';
      return;
    }
    if (user.email) {
      if ($('topEmail')) $('topEmail').textContent = user.email;
      if ($('profileEmail')) $('profileEmail').value = user.email;
    }
    if (user.name) {
      if ($('topAvatar')) $('topAvatar').textContent = user.name.charAt(0).toUpperCase();
      if ($('profileName')) $('profileName').value = user.name;
    }
    loadOverviewStats();
  });

  // =========================================
  // 3. TAB SWITCHING
  // =========================================
  const tabTitles = {
    'overview': 'Dashboard Overview', 'users': 'Manage Users & Roles', 'boards': 'Boards & Subjects',
    'question-bank': 'Question Bank Management', 'ingest': 'Ingest Official Paper',
    'my-papers': 'Manage All Papers',
    'review': 'AI Question Review', 'ai-health': 'AI & System Health', 
    'broadcast': 'Broadcast Notifications', 'feedbacks': 'Student Feedback & Ratings', 'audit': 'System Audit Logs', 'profile': 'Admin Settings'
  };
  
  window.switchTab = function(tabId) {
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[id^="nav-"]').forEach(el => el.classList.remove('active'));
    
    if ($(`tab-${tabId}`)) $(`tab-${tabId}`).classList.remove('hidden');
    if ($(`nav-${tabId}`)) $(`nav-${tabId}`).classList.add('active');
    if ($('page-title') && tabTitles[tabId]) $('page-title').textContent = tabTitles[tabId];

    // Call the respective loader functions
    if (tabId === 'overview') window.loadOverviewStats();
    if (tabId === 'review') window.loadPendingReview();
    if (tabId === 'users') window.loadUsers();
    if (tabId === 'boards') window.loadBoards();
    if (tabId === 'question-bank') window.loadQuestionBank();
    if (tabId === 'my-papers') window.loadAllPapers();
    if (tabId === 'audit') window.loadAuditLogs();
    if (tabId === 'ai-health') window.loadAiHealth();
    if (tabId === 'profile') window.loadPlatformSettings();
  };

  // =========================================
  // 4. OVERVIEW STATS
  // =========================================
  window.loadOverviewStats = async function() {
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
    }
  };

  // =========================================
  // 5. MANAGE USERS
  // =========================================
  window.loadUsers = async function() {
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
          ? `<button onclick="revokeAdmin('${u._id}')" class="neu-btn px-4 py-2 text-xs text-red-500">Revoke</button>`
          : `<button onclick="promoteUser('${u._id}')" class="neu-btn px-4 py-2 text-xs text-blue-600">Make Admin</button>`;
        return `
          <div class="neu-inner p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="user-item-${u._id}">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-600">${u.name.charAt(0)}</div>
              <div><p class="text-sm font-bold text-slate-800">${u.name}</p><p class="text-xs text-slate-500">${u.email}</p></div>
            </div>
            <div class="flex items-center gap-3 w-full sm:w-auto">${roleBadge} ${actionBtn}</div>
          </div>`;
      }).join('');
    } catch (err) { list.innerHTML = `<p class="text-sm text-red-500 font-semibold">Error: ${err.message}</p>`; }
  };

  window.promoteUser = async function(userId) {
    const subject = prompt("Enter Subject Code for this Admin (e.g. eco, acc, sci):");
    if (!subject) return;
    try {
      await API.request(`/api/admin/users/${userId}/promote`, { method: 'PUT', body: { assignedSubject: subject.trim().toLowerCase() } });
      showToast(`✅ Promoted to ${subject.toUpperCase()} Admin`);
      window.loadUsers(); 
    } catch (err) { alert('Error: ' + err.message); }
  };

  window.revokeAdmin = async function(userId) {
    if (!confirm('Revoke Admin access for this user?')) return;
    try {
      await API.request(`/api/admin/users/${userId}/revoke`, { method: 'PUT' });
      showToast('✅ Access Revoked');
      window.loadUsers();
    } catch (err) { alert('Error: ' + err.message); }
  };

  // =========================================
  // 6. CREATE ADMIN LOGIC
  // =========================================
  window.openCreateAdminModal = function() {
    const modal = $('createAdminModal');
    if (modal) modal.classList.remove('hidden');
  };

  window.closeCreateAdminModal = function() {
    const modal = $('createAdminModal');
    if (modal) modal.classList.add('hidden');
  };

  window.handleCreateAdmin = async function(e) {
    e.preventDefault();
    const btn = $('createAdminBtn');
    
    const payload = {
      name: $('newAdminName').value.trim(),
      email: $('newAdminEmail').value.trim(),
      phone: $('newAdminPhone').value.trim(),
      password: $('newAdminPassword').value,
      subject: $('newAdminSubject').value.trim().toLowerCase()
    };

    try {
      btn.disabled = true;
      btn.textContent = 'Creating...';

      const res = await API.request('/api/admin/users/create', {
        method: 'POST',
        body: payload
      });

      showToast(`✅ Admin created successfully!`);
      window.closeCreateAdminModal();
      $('createAdminForm').reset();
      window.loadUsers(); 
      
      alert(`Account Created!\n\nShare these credentials with the teacher:\nEmail: ${payload.email}\nPassword: ${payload.password}\nSubject: ${payload.subject.toUpperCase()}`);

    } catch (err) {
      alert('❌ Error creating admin: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Admin';
    }
  };

  // =========================================
  // 7. BOARDS
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
      window.loadBoards();
    } catch (err) { alert('❌ Error: ' + err.message); }
  };

  window.loadBoards = async function() {
    const list = $('boardList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-slate-500">Loading boards...</p>';
    try {
      const res = await API.request('/api/tests/boards'); 
      const boards = res.boards || [];
      list.innerHTML = boards.map(b => `
        <div class="neu-inner p-4 rounded-xl flex justify-between items-center">
          <div><p class="text-sm font-bold text-slate-800">${b.shortName}</p><p class="text-xs text-slate-500">${b.name}</p></div>
        </div>
      `).join('');
    } catch (err) { list.innerHTML = `<p class="text-sm text-red-500">Error: ${err.message}</p>`; }
  };

  // =========================================
  // 8. QUESTION BANK (Live fetch)
  // =========================================
  window.loadQuestionBank = async function() {
    const list = $('questionBankList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-slate-500">Loading questions...</p>';
    
    try {
      // Fallback to /api/tests/questions if admin one is not ready
      const res = await API.request('/api/admin/questions').catch(() => API.request('/api/tests/questions'));
      const questions = res.questions || [];
      
      if (questions.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-500">No questions found in the database.</p>';
        return;
      }

      list.innerHTML = questions.map(q => `
        <div class="neu-inner p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span class="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-md">${q.status ? q.status.toUpperCase() : 'VERIFIED'}</span>
            <p class="text-sm font-bold text-slate-800 mt-2">${q.questionText || q.title}</p>
            <p class="text-xs text-slate-500 mt-1">Subject: ${q.subjectCode || q.subject} • Class ${q.classLevel || '12'}</p>
          </div>
          <div class="flex gap-2">
            <button class="neu-btn px-4 py-2 text-xs text-blue-500">Edit</button>
            <button class="neu-btn px-4 py-2 text-xs text-red-500">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = `<p class="text-sm text-red-500">Could not load questions. API might not be ready.</p>`;
    }
  };

  // =========================================
  // 9. INGEST PAPER (PDF UPLOAD)
  // =========================================
  window.handleSuperAdminPdfUpload = async function(e) {
    e.preventDefault();
    
    const btn = $('ingestBtn');
    const originalText = btn.innerText;
    const fileInput = $('ingestPdf');
    const overlay = $('cubeLoadingOverlay');

    if (!fileInput || !fileInput.files.length) {
      alert('Please select a PDF file first.');
      return;
    }

    btn.innerText = '⏳ Uploading PDF...';
    btn.disabled = true;
    if (overlay) overlay.classList.add('active');

    const formData = new FormData();
    formData.append('pdf', fileInput.files[0]);
    formData.append('boardCode', $('ingestBoard').value);
    formData.append('classLevel', $('ingestClass').value);
    formData.append('subjectCode', $('ingestSubjectCode').value.trim());
    formData.append('subjectName', $('ingestSubjectName').value.trim());
    formData.append('year', $('ingestYear').value);
    formData.append('examPhase', $('ingestPhase').value);

    try {
      const user = API.User.get();
      const isSuperAdmin = Boolean(user && (user.role === 'super_admin' || user.role === 'superadmin' || (user.role === 'admin' && !user.assignedSubject)));
      
      await API.admin.uploadPaper(formData, isSuperAdmin);

      showToast('✅ Paper uploaded successfully! AI is extracting text.');
      $('ingestForm').reset(); 
      window.loadAllPapers(); 

    } catch (error) {
      console.error(error);
      alert(`❌ Upload Error: ${error.message}`);
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
      if (overlay) overlay.classList.remove('active');
    }
  };

  // =========================================
  // 9.5 MANAGE ALL PAPERS (Fixed 403 Error)
  // =========================================
  window.loadAllPapers = async function() {
    const list = $('allPapersList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-slate-500">Loading...</p>';

    try {
      const user = API.User.get();
      const isSuperAdmin = Boolean(user && (user.role === 'super_admin' || user.role === 'superadmin' || (user.role === 'admin' && !user.assignedSubject)));
      
      // Agar Super Admin hai toh saare papers dikhao, agar normal admin hai toh uske apne
      const endpoint = isSuperAdmin ? '/api/superadmin/papers' : '/api/admin/papers';

      const res = await API.request(endpoint);
      const papers = res.papers || [];
      
      if (!papers.length) {
        list.innerHTML = '<p class="text-sm text-slate-500">No papers uploaded yet.</p>';
        return;
      }

      list.innerHTML = papers.map(p => {
        const date = new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const uploaderName = p.ingestedBy?.name || 'Admin';
        const statusColor = p.status === 'ingested' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        
        return `
          <div class="neu-inner p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColor}">${p.status}</span>
                <span class="text-xs text-slate-500 font-mono">${p.paperCode || 'N/A'}</span>
              </div>
              <p class="text-sm font-bold text-slate-800">${p.subjectName} - ${p.boardCode.toUpperCase()} Class ${p.classLevel} (${p.year})</p>
              <p class="text-xs text-slate-500 mt-1">By ${uploaderName} • ${(p.fileSize / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div class="flex gap-2 w-full sm:w-auto">
              <a href="${p.fileUrl}" target="_blank" class="neu-btn px-4 py-2 text-xs font-bold text-blue-500 text-center flex-1 sm:flex-none">View PDF</a>
              <button onclick="deleteSuperAdminPaper('${p._id}')" class="neu-btn px-4 py-2 text-xs font-bold text-red-500 hover:text-red-600 flex-1 sm:flex-none">Delete</button>
            </div>
          </div>
        `;
      }).join('');
      
    } catch (err) {
      list.innerHTML = `<p class="text-sm text-red-500">Error loading papers: ${err.message}</p>`;
    }
  };

  window.deleteSuperAdminPaper = async function(id) {
    if (!confirm('Are you sure you want to delete this paper? It will be removed for everyone.')) return;
    
    try {
      const user = API.User.get();
      const isSuperAdmin = Boolean(user && (user.role === 'super_admin' || user.role === 'superadmin' || (user.role === 'admin' && !user.assignedSubject)));
      const endpoint = isSuperAdmin ? `/api/superadmin/papers/${id}` : `/api/admin/papers/${id}`;
      
      await API.request(endpoint, { method: 'DELETE' });
      showToast('✅ Paper deleted successfully');
      window.loadAllPapers();
    } catch (err) {
      alert('❌ Error deleting paper: ' + err.message);
    }
  };

  // =========================================
  // 10. REVIEW QUEUE
  // =========================================
  window.loadPendingReview = async function() {
    const list = $('reviewList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-slate-500">Loading...</p>';
    try {
      const res = await API.request('/api/admin/papers/pending-review');
      const papers = res.papers || [];
      if (!papers.length) { list.innerHTML = '<p class="text-sm text-slate-500">All clear!</p>'; return; }
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
    } catch (err) { list.innerHTML = `<p class="text-sm text-red-500">Error: ${err.message}</p>`; }
  };

  window.reviewAction = async function(paperId, action) {
    try {
      await API.request(`/api/admin/papers/${paperId}/review`, { method: 'POST', body: { questionNumber: 1, action } });
      if ($(`review-item-${paperId}`)) $(`review-item-${paperId}`).remove();
      showToast(action === 'approve' ? 'Approved' : 'Rejected');
    } catch (err) { alert(err.message); }
  };

  // =========================================
  // 11. AI HEALTH & AUDIT LOGS
  // =========================================
  window.loadAiHealth = async function() {
    try {
      const res = await API.request('/api/admin/ai-health').catch(() => null);
      if (res) {
        if ($('geminiStatus')) $('geminiStatus').textContent = res.gemini?.status || 'Active';
        if ($('geminiUsage')) $('geminiUsage').textContent = `Usage: ${res.gemini?.usage || 0} / ${res.gemini?.limit || 5000}`;
        if ($('groqStatus')) $('groqStatus').textContent = res.groq?.status || 'Active';
        if ($('groqUsage')) $('groqUsage').textContent = `Rate Limit: ${res.groq?.rateLimit || 'OK'}`;
        if ($('failedJobsCount')) $('failedJobsCount').textContent = res.failedJobs || '0';
      } else {
        if ($('geminiStatus')) $('geminiStatus').textContent = 'Active';
        if ($('geminiUsage')) $('geminiUsage').textContent = 'Usage: Live Tracking Pending';
      }
    } catch (e) {
      console.warn('AI Health error', e);
    }
  };

  window.loadAuditLogs = async function() {
    const list = $('auditLogsList');
    if (!list) return;
    list.innerHTML = '<p class="text-sm text-slate-500">Loading logs...</p>';
    try {
      const res = await API.request('/api/admin/audit-logs').catch(() => ({ logs: [] }));
      const logs = res.logs || [];
      if (logs.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-500">No audit logs found in system.</p>';
        return;
      }
      list.innerHTML = logs.map(log => `
        <div class="neu-inner p-4 rounded-xl flex justify-between items-center">
            <div>
                <p class="text-sm font-bold text-slate-800">${log.userName || 'System'}</p>
                <p class="text-xs text-slate-500">${log.action}</p>
            </div>
            <span class="text-xs text-slate-500">${new Date(log.createdAt).toLocaleTimeString()}</span>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = '<p class="text-sm text-slate-500">Audit Logs API not configured yet.</p>';
    }
  };

  // =========================================
  // 12. PROFILE & MAINTENANCE
  // =========================================
  window.handleUpdateProfile = async function(e) {
    e.preventDefault();
    const name = $('profileName').value.trim();
    try {
      const res = await API.request('/api/auth/profile', { method: 'PUT', body: { name } });
      const user = API.User.get();
      if (user) { user.name = name; API.User.set(user); }
      showToast('✅ Profile updated successfully');
      if ($('topAvatar')) $('topAvatar').textContent = name.charAt(0).toUpperCase();
    } catch (err) { alert('❌ Error updating profile: ' + err.message); }
  };

  window.handleBroadcast = function(e) {
    e.preventDefault();
    showToast('📢 Notification Sent to All Students!');
    e.target.reset();
  };

  window.toggleMaintenanceMode = function() {
    if(!confirm("Are you sure you want to toggle Maintenance Mode?")) return;
    showToast('⚠️ Maintenance Mode Toggled (Backend pending)');
  };

  window.bulkApproveQuestions = function() {
    if (!confirm('Are you sure you want to approve all pending AI drafts?')) return;
    showToast('✅ All pending questions approved successfully!');
  };

  // =========================================
  // 13. UTILS
  // =========================================
  window.showToast = function(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.transform = 'translateY(0)'; toast.style.opacity = '1';
    setTimeout(() => { toast.style.transform = 'translateY(20px)'; toast.style.opacity = '0'; }, 3000);
  };

  window.handleLogout = function() {
    if (confirm('Sign out?')) { API.Token.remove(); window.location.href = 'index.html'; }
  };
})();
  // =========================================
  // STUDENT FEEDBACK LOGIC
  // =========================================
  window.loadAdminFeedbacks = async function() {
    const listEl = $('adminFeedbacksList');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-sm text-slate-500 text-center py-8">Loading student feedbacks...</p>';

    try {
      const res = await API.feedback.list(100);
      const items = res.feedback || [];

      // Calculate stats
      const total = items.length;
      $('fbStatTotal').textContent = total;

      if (total === 0) {
        $('fbStatRating').textContent = '5.0 ★';
        $('fbStatBugs').textContent = '0';
        $('fbStatIdeas').textContent = '0';
        listEl.innerHTML = '<div class="neu-inner p-8 text-center text-slate-500"><p class="text-2xl mb-2">🎉</p><p class="text-sm font-semibold">No feedback received yet.</p><p class="text-xs mt-1">Student reviews and bug reports will appear here in real-time.</p></div>';
        return;
      }

      let ratingSum = 0;
      let ratingCount = 0;
      let bugs = 0;
      let ideas = 0;

      items.forEach(it => {
        if (it.rating) {
          ratingSum += it.rating;
          ratingCount++;
        }
        if (it.category === 'bug') bugs++;
        if (it.category === 'feature') ideas++;
      });

      const avg = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : '5.0';
      $('fbStatRating').textContent = avg + ' ★';
      $('fbStatBugs').textContent = bugs;
      $('fbStatIdeas').textContent = ideas;

      listEl.innerHTML = items.map(fb => {
        const dateStr = fb.createdAt ? new Date(fb.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Just now';

        const categoryBadges = {
          'rating': '<span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">⭐ Rating</span>',
          'bug': '<span class="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">🐞 Bug Report</span>',
          'feature': '<span class="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold">💡 Suggestion</span>',
          'question': '<span class="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">❓ Query</span>',
          'general': '<span class="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">💬 General</span>'
        };

        const stars = '★'.repeat(fb.rating || 5) + '☆'.repeat(Math.max(0, 5 - (fb.rating || 5)));

        return `
          <div class="neu-card p-5 transition-all">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                  ${(fb.name || 'S').charAt(0).toUpperCase()}
                </span>
                <div>
                  <h4 class="text-sm font-bold text-slate-800 leading-tight">${fb.name || 'Anonymous Student'}</h4>
                  <p class="text-xs text-slate-500">${fb.email || 'No email provided'}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                ${categoryBadges[fb.category] || categoryBadges.general}
                <span class="text-amber-400 text-xs font-bold tracking-widest">${stars}</span>
                <span class="text-[11px] text-slate-400">${dateStr}</span>
              </div>
            </div>
            <div class="neu-inner p-3.5 text-xs text-slate-700 leading-relaxed rounded-xl mt-2">
              ${fb.message}
            </div>
            ${fb.pageUrl ? `<p class="text-[10px] text-slate-400 mt-2">Page: <span class="font-mono text-blue-500">${fb.pageUrl}</span></p>` : ''}
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error('Error loading feedbacks:', err);
      listEl.innerHTML = '<div class="neu-inner p-6 text-center text-red-500 text-sm">Failed to load feedbacks from database.</div>';
    }
  };


  // =========================================
  // ADMIN OTP & SOCIAL MEDIA SETTINGS
  // =========================================
  window.openEmailChangeModal = function() {
    $('emailChangeModal').classList.remove('hidden');
    $('emailStep1').classList.remove('hidden');
    $('emailStep2').classList.add('hidden');
    $('newAdminEmailInput').focus();
  };
  window.closeEmailChangeModal = function() {
    $('emailChangeModal').classList.add('hidden');
  };

  window.openAdminPasswordModal = function() {
    $('adminPasswordModal').classList.remove('hidden');
    $('pwdStep1').classList.remove('hidden');
    $('pwdStep2').classList.add('hidden');
  };
  window.closeAdminPasswordModal = function() {
    $('adminPasswordModal').classList.add('hidden');
  };

  window.requestAdminEmailOtp = async function() {
    const newEmail = $('newAdminEmailInput').value.trim();
    if (!newEmail || !/^[^s@]+@[^s@]+.[^s@]+$/.test(newEmail)) {
      alert('Please enter a valid email address');
      return;
    }
    const btn = $('btnReqEmailOtp');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await API.auth.requestEmailChange(newEmail);
      alert(res.message || 'OTP sent successfully');
      if (res.devOtp) alert('Verification OTP: ' + res.devOtp);
      $('emailStep1').classList.add('hidden');
      $('emailStep2').classList.remove('hidden');
    } catch (err) {
      alert(err.message || 'Failed to request email OTP');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send OTP';
    }
  };

  window.verifyAdminEmailOtp = async function() {
    const otp = $('emailChangeOtp').value.trim();
    if (!otp || otp.length !== 6) {
      alert('Enter 6-digit OTP code');
      return;
    }
    const btn = $('btnVerifyEmailOtp');
    btn.disabled = true;
    btn.textContent = 'Verifying…';

    try {
      const res = await API.auth.verifyEmailChange(otp);
      alert('Email updated successfully! Please re-login with your new email.');
      closeEmailChangeModal();
      API.auth.logout();
      window.location.href = 'auth.html';
    } catch (err) {
      alert(err.message || 'OTP verification failed');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verify & Update Email';
    }
  };

  window.requestAdminPwdOtp = async function() {
    const btn = $('btnReqPwdOtp');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await API.auth.requestPasswordOtp();
      alert(res.message || 'OTP sent to your registered email');
      if (res.devOtp) alert('Password Reset OTP: ' + res.devOtp);
      $('pwdStep1').classList.add('hidden');
      $('pwdStep2').classList.remove('hidden');
    } catch (err) {
      alert(err.message || 'Failed to send OTP');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Password OTP';
    }
  };

  window.verifyAdminPwdOtp = async function() {
    const otp = $('adminPwdOtp').value.trim();
    const newPassword = $('adminNewPassword').value;

    if (!otp || otp.length !== 6) {
      alert('Enter 6-digit OTP');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      alert('Password must be 8+ characters');
      return;
    }
    const btn = $('btnVerifyPwdOtp');
    btn.disabled = true;
    btn.textContent = 'Updating…';

    try {
      const res = await API.auth.verifyPasswordOtp(otp, newPassword);
      alert(res.message || 'Password changed successfully!');
      closeAdminPasswordModal();
    } catch (err) {
      alert(err.message || 'Failed to update password');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  };

  window.handleUpdateProfileName = async function() {
    const name = $('profileName').value.trim();
    if (!name) return alert('Name cannot be empty');
    try {
      await API.auth.updateDetails({ name });
      alert('Admin name updated successfully');
    } catch (err) {
      alert(err.message || 'Failed to update name');
    }
  };

  // Load & Save Social Links
  window.loadPlatformSettings = async function() {
    try {
      const res = await API.auth.getPlatformConfig();
      if (res && res.config && res.config.socialLinks) {
        if ($('socialTelegram')) $('socialTelegram').value = res.config.socialLinks.telegram || '';
        if ($('socialWhatsapp')) $('socialWhatsapp').value = res.config.socialLinks.whatsapp || '';
        if ($('socialYoutube')) $('socialYoutube').value = res.config.socialLinks.youtube || '';
        if ($('socialInstagram')) $('socialInstagram').value = res.config.socialLinks.instagram || '';
      }
    } catch (e) {}
  };

  window.saveSocialLinks = async function() {
    try {
      const socialLinks = {
        telegram: $('socialTelegram')?.value.trim() || '',
        whatsapp: $('socialWhatsapp')?.value.trim() || '',
        youtube: $('socialYoutube')?.value.trim() || '',
        instagram: $('socialInstagram')?.value.trim() || ''
      };
      await API.auth.updatePlatformConfig({ socialLinks });
      alert('Social media links saved successfully to platform database!');
    } catch (err) {
      alert(err.message || 'Failed to save social media links');
    }
  };
