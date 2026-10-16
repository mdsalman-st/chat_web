/**
 * ============================================================================
 * API.JS — Shared API Client for Nexus Frontend
 * ============================================================================
 * Har page isko use karega. Token management + all API calls.
 * ============================================================================
 */

(function (window) {
  'use strict';

  const API_BASE = 'https://chat-web-backend-1-8wgm.onrender.com';
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
     ROOMS API
     -------------------------------------------------------------------------- */
  const rooms = {
    create(name = '') {
      return request('/api/rooms', { method: 'POST', body: { name } });
    },
    join(code) {
      return request('/api/rooms/join', { method: 'POST', body: { code } });
    },
    list() {
      return request('/api/rooms');
    },
    get(id) {
      return request('/api/rooms/' + id);
    },
    messages(id, limit = 50, before = null) {
      const params = new URLSearchParams({ limit });
      if (before) params.set('before', before);
      return request('/api/rooms/' + id + '/messages?' + params.toString());
    },
    send(id, text) {
      return request('/api/rooms/' + id + '/messages', {
        method: 'POST',
        body: { text },
      });
    },
    remove(id) {
      return request('/api/rooms/' + id, { method: 'DELETE' });
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
     EXPORT
     -------------------------------------------------------------------------- */
  window.API = {
    base: API_BASE,
    Token,
    User,
    auth,
    tasks,
    notes,
    rooms,
    health,
    request,
  };

  console.log('%c🔗 API Client Ready', 'color:#22d3ee;font-weight:bold', API_BASE);

})(window);