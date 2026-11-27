/**
 * ============================================================================
 * API.JS — Shared API Client for MAJID Frontend
 * ============================================================================
 * Har page isko use karega. Token management + all API calls.
 * ============================================================================
 */

(function (window) {
  'use strict';

  const API_BASE = (function() {
    try {
      const custom = localStorage.getItem('nexus_api_base');
      if (custom) return custom;
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:5000';
      }
    } catch (e) {}
    return 'https://chat-web-backend-1-8wgm.onrender.com';
  })();
  const TOKEN_KEY = 'nexus_token';
  const USER_KEY = 'nexus_user';

  /* --------------------------------------------------------------------------
     TOKEN MANAGEMENT
     -------------------------------------------------------------------------- */
  const Token = {
    get() {
      try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
    },
    set(token) {
      try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
    },
    remove() {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch (e) {}
    },
    exists() {
      return !!this.get();
    },
  };

  /* --------------------------------------------------------------------------
     USER CACHE
     -------------------------------------------------------------------------- */
  const User = {
    get() {
      try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
      catch (e) { return null; }
    },
    set(user) {
      try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) {}
    },
  };

  /* --------------------------------------------------------------------------
     CORE REQUEST
     -------------------------------------------------------------------------- */
  async function request(path, options = {}) {
    const url = API_BASE + path;
    const token = Token.get();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) headers.Authorization = 'Bearer ' + token;

    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      body = JSON.stringify(body);
    }
    if (body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const res = await fetch(url, {
      ...options,
      headers,
      body,
    });

    if (res.status === 401) {
      Token.remove();
    }

    let data;
    try { data = await res.json(); } catch (e) { data = {}; }

    if (!res.ok) {
      const err = new Error(data.message || data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  /* --------------------------------------------------------------------------
     AUTH API
     -------------------------------------------------------------------------- */
  const auth = {
    async signup(payload) {
      const data = await request('/api/auth/signup', {
        method: 'POST',
        body: payload,
      });
      if (data.token) {
        Token.set(data.token);
        User.set(data.user);
      }
      return data;
    },

    async login(email, password) {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (data.token) {
        Token.set(data.token);
        User.set(data.user);
      }
      return data;
    },

    async me() {
      const data = await request('/api/auth/me');
      if (data.user) User.set(data.user);
      return data;
    },

    async updateDetails(roleDetails) {
      const data = await request('/api/auth/details', {
        method: 'PUT',
        body: { roleDetails },
      });
      if (data.user) User.set(data.user);
      return data;
    },

    async updateCredentials(username, secretCode) {
      const data = await request('/api/auth/credentials', {
        method: 'PUT',
        body: { username, secretCode },
      });
      if (data.user) User.set(data.user);
      return data;
    },

    async checkUsername(username) {
      return request('/api/auth/check-username/' + encodeURIComponent(username));
    },

    forgotPassword(email) {
      return request('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
    },

    resetPassword(email, otp, newPassword) {
      return request('/api/auth/reset-password', {
        method: 'POST',
        body: { email, otp, newPassword },
      });
    },

    requestEmailChange(newEmail) {
      return request('/api/auth/request-email-change', {
        method: 'POST',
        body: { newEmail },
      });
    },

    verifyEmailChange(otp) {
      return request('/api/auth/verify-email-change', {
        method: 'POST',
        body: { otp },
      });
    },

    requestPasswordOtp() {
      return request('/api/auth/request-password-otp', {
        method: 'POST',
      });
    },

    verifyPasswordOtp(otp, newPassword) {
      return request('/api/auth/verify-password-otp', {
        method: 'POST',
        body: { otp, newPassword },
      });
    },

    getPlatformConfig() {
      return request('/api/auth/platform-config');
    },

    updatePlatformConfig(payload) {
      return request('/api/auth/platform-config', {
        method: 'PUT',
        body: payload,
      });
    },

    logout() {
      Token.remove();
    },
  };

  /* --------------------------------------------------------------------------
     TASKS API
     -------------------------------------------------------------------------- */
  const tasks = {
    list(filter = 'all', search = '') {
      const params = new URLSearchParams({ filter, search });
      return request('/api/tasks?' + params.toString());
    },
    create(payload) {
      return request('/api/tasks', { method: 'POST', body: payload });
    },
    get(id) {
      return request('/api/tasks/' + id);
    },
    update(id, payload) {
      return request('/api/tasks/' + id, { method: 'PUT', body: payload });
    },
    toggle(id) {
      return request('/api/tasks/' + id + '/toggle', { method: 'PATCH' });
    },
    remove(id) {
      return request('/api/tasks/' + id, { method: 'DELETE' });
    },
    stats() {
      return request('/api/tasks/stats');
    },
  };

  /* --------------------------------------------------------------------------
     NOTES API
     -------------------------------------------------------------------------- */
  const notes = {
    list(color = 'all', search = '') {
      const params = new URLSearchParams({ color, search });
      return request('/api/notes?' + params.toString());
    },
    create(payload) {
      return request('/api/notes', { method: 'POST', body: payload });
    },
    get(id) {
      return request('/api/notes/' + id);
    },
    update(id, payload) {
      return request('/api/notes/' + id, { method: 'PUT', body: payload });
    },
    togglePin(id) {
      return request('/api/notes/' + id + '/pin', { method: 'PATCH' });
    },
    remove(id) {
      return request('/api/notes/' + id, { method: 'DELETE' });
    },
    stats() {
      return request('/api/notes/stats');
    },
  };


  /* --------------------------------------------------------------------------
     HEALTH
     -------------------------------------------------------------------------- */
  const health = {
    check() {
      return request('/api/health');
    },
  };

  /* --------------------------------------------------------------------------
     STUDENT TESTS & BOARDS API
     -------------------------------------------------------------------------- */
  const tests = {
    // Board & syllabus discovery
    getBoards() {
      return request('/api/tests/boards');
    },
    getBoard(boardCode) {
      return request('/api/tests/boards/' + encodeURIComponent(boardCode));
    },
    getSubjects(boardCode, classLevel, stream = null) {
      const params = new URLSearchParams();
      if (classLevel) params.set('class', classLevel);
      if (stream) params.set('stream', stream);
      return request('/api/tests/boards/' + encodeURIComponent(boardCode) + '/subjects?' + params.toString());
    },
    getChapters(boardCode, classLevel, subjectCode, stream = null, phase = null, medium = null) {
      const params = new URLSearchParams({ subject: subjectCode });
      if (classLevel) params.set('class', classLevel);
      if (stream) params.set('stream', stream);
      if (phase) params.set('phase', phase);
      if (medium) params.set('medium', medium);
      return request('/api/tests/boards/' + encodeURIComponent(boardCode) + '/chapters?' + params.toString());
    },

    // Student academic profile
    getProfile() {
      return request('/api/tests/profile');
    },
    updateProfile(payload) {
      return request('/api/tests/profile', {
        method: 'PUT',
        body: payload,
      });
    },

    // Phase 2: Question preparation & lazy loading
    prepareChapter(payload) {
      return request('/api/tests/chapters/prepare', {
        method: 'POST',
        body: payload,
      });
    },
    prepareChapterMcqPractice(payload) {
      return request('/api/tests/chapters/prepare-mcq-practice', {
        method: 'POST',
        body: payload,
      });
    },
    getJobStatus(jobId) {
      return request('/api/tests/jobs/' + encodeURIComponent(jobId), { cache: 'no-store' });
    },
    getChapterQuestions(chapterNumber, queryParams = {}) {
      const params = new URLSearchParams(queryParams);
      return request('/api/tests/chapters/' + encodeURIComponent(chapterNumber) + '/questions?' + params.toString());
    },

    // Test engine methods (phases 2-6)
    startTest(payload) {
      return request('/api/tests/start', {
        method: 'POST',
        body: payload,
      });
    },
    submitAnswer(attemptId, payload) {
      return request('/api/tests/' + encodeURIComponent(attemptId) + '/answer', {
        method: 'POST',
        body: payload,
      });
    },
    finishTest(attemptId) {
      return request('/api/tests/' + encodeURIComponent(attemptId) + '/finish', {
        method: 'POST',
      });
    },
    getResult(attemptId) {
      return request('/api/tests/' + encodeURIComponent(attemptId) + '/result');
    },
    getRecentResults(limit = 10) {
      return request('/api/tests/results/recent?limit=' + limit);
    },
    reportQuestion(questionId, payload) {
      return request('/api/tests/questions/' + encodeURIComponent(questionId) + '/flag', {
        method: 'POST',
        body: payload,
      });
    },
    getAttemptState(attemptId) {
      return request('/api/tests/' + encodeURIComponent(attemptId) + '/state');
    },
    syncAttemptQuestions(attemptId) {
      return request('/api/tests/' + encodeURIComponent(attemptId) + '/questions/sync', {
        method: 'POST',
      });
    },
    retryGeneration(attemptId) {
      return request('/api/tests/' + encodeURIComponent(attemptId) + '/generation/retry', {
        method: 'POST',
      });
    },
    updateAttemptState(attemptId, payload) {
      return request('/api/tests/' + encodeURIComponent(attemptId) + '/state', {
        method: 'PATCH',
        body: payload,
      });
    },

    // Phase 4: Diagnostic PDF Report, Asynchronous Analysis Queue & Notifications
    getPdfToken(attemptId) {
      return request('/api/tests/' + encodeURIComponent(attemptId) + '/pdf-token');
    },
    async downloadPdf(attemptId, wrongOnly = false) {
      const res = await this.getPdfToken(attemptId);
      if (res && res.downloadUrl) {
        const url = wrongOnly ? res.wrongOnlyUrl : res.downloadUrl;
        const link = document.createElement('a');
        link.href = API_BASE + url;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    queueAnalysis(attemptId) {
      return request('/api/tests/' + encodeURIComponent(attemptId) + '/queue-analysis', {
        method: 'POST',
      });
    },
    getNotifications(limit = 15) {
      return request('/api/tests/notifications?limit=' + limit);
    },
    markNotificationRead(id) {
      return request('/api/tests/notifications/' + encodeURIComponent(id) + '/read', {
        method: 'PATCH',
      });
    },

    // Phase 5: Official Board Papers & Ingestion
    getAvailablePapers(subjectCode, phase = null) {
      let q = '/api/tests/papers/available?subjectCode=' + encodeURIComponent(subjectCode);
      if (phase) q += '&examPhase=' + encodeURIComponent(phase);
      return request(q);
    },
    getPaper(paperId) {
      return request('/api/tests/papers/' + encodeURIComponent(paperId));
    },
    startPaperTest(paperId, payload = {}) {
      return request('/api/tests/papers/' + encodeURIComponent(paperId) + '/start', {
        method: 'POST',
        body: payload,
      });
    },
    getPaperAnswers(paperId) {
      return request('/api/tests/papers/' + encodeURIComponent(paperId) + '/answers');
    },
    getMvviAnalysis(subjectCode) {
      return request('/api/tests/papers/mvvi-analysis?subjectCode=' + encodeURIComponent(subjectCode));
    },
    ingestPaper(paperData) {
      return request('/api/tests/papers/ingest', {
        method: 'POST',
        body: paperData,
      });
    },
    getPapersPendingReview() {
      return request('/api/tests/papers/pending-review');
    },
    reviewPaperMatch(paperId, payload) {
      return request('/api/tests/papers/' + encodeURIComponent(paperId) + '/review-match', {
        method: 'POST',
        body: payload,
      });
    },
  };

  /* --------------------------------------------------------------------------
     PHASE 6: SUBJECTIVE HANDWRITING OCR & EVALUATION
     -------------------------------------------------------------------------- */
  const subjective = {
    uploadSheet(formDataOrPayload) {
      return request('/api/subjective/upload', {
        method: 'POST',
        body: formDataOrPayload,
      });
    },
    getStatus(submissionId) {
      return request('/api/subjective/' + encodeURIComponent(submissionId) + '/status');
    },
    getResult(submissionId) {
      return request('/api/subjective/' + encodeURIComponent(submissionId) + '/result');
    },
    getRecent(limit = 10) {
      return request('/api/subjective/recent?limit=' + limit);
    },
    retry(submissionId) {
      return request('/api/subjective/' + encodeURIComponent(submissionId) + '/retry', {
        method: 'POST',
      });
    },
  };

  /* --------------------------------------------------------------------------
     ADMIN API (Super Admin & Subject Admin - NAYA MODULE)
     -------------------------------------------------------------------------- */
  const admin = {
    // Stats & Dashboard
    getStats() {
      return request('/api/admin/stats');
    },
    
    // 👇 NAYA: File Upload Function (No BASE_URL needed) 👇
    uploadPaper(formData, isSuperAdmin = false) {
      const endpoint = isSuperAdmin ? '/api/superadmin/papers/upload' : '/api/admin/papers/upload';
      return request(endpoint, { 
        method: 'POST', 
        body: formData 
      });
    },

    // User Management
    getUsers() {
      return request('/api/admin/users');
    },
    promoteUser(userId, assignedSubject) {
      return request('/api/admin/users/' + userId + '/promote', {
        method: 'PUT',
        body: { assignedSubject }
      });
    },
    revokeAdmin(userId) {
      return request('/api/admin/users/' + userId + '/revoke', {
        method: 'PUT'
      });
    },

    // Board Management
    addBoard(payload) {
      return request('/api/admin/boards', {
        method: 'POST',
        body: payload
      });
    },

    // Flags Management
    getFlags() {
      return request('/api/admin/flags');
    },
    resolveFlag(flagId, action) {
      return request('/api/admin/flags/' + flagId + '/resolve', {
        method: 'POST',
        body: { action }
      });
    },

    // Paper Ingest & Review (Pointing to admin routes)
    ingestPaper(payload) {
      return request('/api/admin/papers/ingest', {
        method: 'POST',
        body: payload
      });
    },
    getPendingReview() {
      return request('/api/admin/papers/pending-review');
    },
    reviewMatch(paperId, action, questionNumber = 1) {
      return request('/api/admin/papers/' + paperId + '/review', {
        method: 'POST',
        body: { questionNumber, action }
      });
    }
  };

  /* --------------------------------------------------------------------------
     FEEDBACK
     -------------------------------------------------------------------------- */
  const feedback = {
    submit(data) {
      return request('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    list(limit = 50) {
      return request(`/api/feedback?limit=${limit}`);
    }
  };

  /* --------------------------------------------------------------------------
     EXPORT
     -------------------------------------------------------------------------- */
  window.API = {
    base: API_BASE,
    Token,
    User,
    auth,
    tasks,
    notes,
    tests,
    subjective,
    admin,
    feedback,
    health,
    request,
  };

  window.toggleSidebar = window.toggleSidebar || function() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    if (!sb) return;
    const isOpen = sb.classList.toggle('open');
    sb.classList.toggle('-translate-x-full', !isOpen);
    sb.classList.toggle('translate-x-0', isOpen);
    if (bd) bd.classList.toggle('hidden', !isOpen);
  };

  window.handleLogout = window.handleLogout || function() {
    if (!confirm('Sign out?')) return;
    auth.logout();
    window.location.href = 'index.html';
  };

  console.log('%c🔗 API Client Ready', 'color:#22d3ee;font-weight:bold', API_BASE);

  /* --------------------------------------------------------------------------
     PWA SERVICE WORKER + OFFLINE BANNER + GLOBAL ERROR GUARD
     -------------------------------------------------------------------------- */
  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  function updateOnlineStatus() {
    let banner = document.getElementById('majidOfflineBanner');
    if (!navigator.onLine) {
      if (!banner && document.body) {
        banner = document.createElement('div');
        banner.id = 'majidOfflineBanner';
        banner.setAttribute('role', 'status');
        banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;background:#0f172a;color:#f8fafc;border:1px solid rgba(248,113,113,0.4);padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600;box-shadow:0 12px 32px rgba(0,0,0,0.45);display:flex;align-items:center;gap:8px;white-space:nowrap;';
        banner.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#ef4444;display:inline-block;"></span> No internet connection';
        document.body.appendChild(banner);
      }
    } else if (banner) {
      banner.remove();
    }
  }

  window.addEventListener('offline', updateOnlineStatus);
  window.addEventListener('online', updateOnlineStatus);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateOnlineStatus);
  } else {
    updateOnlineStatus();
  }

  window.addEventListener('error', (e) => {
    console.warn('[MAJID Guard] Caught error:', e?.message || e);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.warn('[MAJID Guard] Unhandled promise:', e?.reason?.message || e?.reason || e);
  });

})(window);