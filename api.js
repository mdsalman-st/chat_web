/**
 * ============================================================================
 * API.JS — Shared API Client for Nexus Frontend
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
      const err = new Error(data.error || `Request failed (${res.status})`);
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
    getChapters(boardCode, classLevel, subjectCode, stream = null, phase = null) {
      const params = new URLSearchParams({ subject: subjectCode });
      if (classLevel) params.set('class', classLevel);
      if (stream) params.set('stream', stream);
      if (phase) params.set('phase', phase);
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
    getJobStatus(jobId) {
      return request('/api/tests/jobs/' + encodeURIComponent(jobId));
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
    health,
    request,
  };

  window.toggleSidebar = window.toggleSidebar || function() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    if (!sb) return;
    const isOpen = sb.classList.toggle('open');
    if (bd) bd.classList.toggle('hidden', !isOpen);
  };

  window.handleLogout = window.handleLogout || function() {
    if (!confirm('Sign out?')) return;
    auth.logout();
    window.location.href = 'index.html';
  };

  console.log('%c🔗 API Client Ready', 'color:#22d3ee;font-weight:bold', API_BASE);

})(window);