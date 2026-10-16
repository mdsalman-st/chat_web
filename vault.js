/**
 * ============================================================================
 * VAULT.JS — Secret Chat Logic (No HTML injection)
 * HTML comes from vault.html (pasted in each page)
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const state = {
    open: false,
    activeTab: 'contacts',
    activeChat: null, // { type: 'contact'|'room', id, name, ... }
    socket: null,
    rooms: [],
    contacts: [],
  };

  /* ══════════════════════════════════════════════════════════════════════════
     UTILITIES
     ══════════════════════════════════════════════════════════════════════════ */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  function timeStr(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function toast(msg, type = 'info') {
    if (typeof window.toast === 'function') return window.toast(msg, type);
    // fallback
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', bottom: '24px', left: '50%',
      transform: 'translateX(-50%) translateY(20px)',
      background: type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#111827',
      color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '12px',
      fontSize: '0.85rem', fontWeight: '600', zIndex: '99999',
      opacity: '0', transition: 'all 0.3s ease', pointerEvents: 'none',
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(() => { t.style.opacity = '0'; t.remove(); }, 2200);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     OPEN / CLOSE
     ══════════════════════════════════════════════════════════════════════════ */
  function openVault() {
    const vault = $('chatVault');
    if (!vault) return;

    vault.classList.remove('vault-hidden');
    vault.classList.remove('chat-open'); // start on list view (mobile)
    state.open = true;
    document.body.style.overflow = 'hidden';

    switchTab('contacts');
    loadRooms();
    loadConversations();
  }

  function closeVault() {
    const vault = $('chatVault');
    if (!vault) return;

    vault.classList.add('vault-hidden');
    vault.classList.remove('chat-open');
    state.open = false;
    state.activeChat = null;
    document.body.style.overflow = '';
    $('vaultChat')?.classList.add('hidden');
    $('vaultNoChat')?.classList.remove('hidden');
  }

  /* ══════════════════════════════════════════════════════════════════════════
     TAB SWITCHING
     ══════════════════════════════════════════════════════════════════════════ */
  function switchTab(tab) {
    state.activeTab = tab;

    document.querySelectorAll('.vault-tab').forEach((b) =>
      b.classList.toggle('active', b.dataset.vtab === tab)
    );
    document.querySelectorAll('.vault-panel').forEach((p) =>
      p.classList.toggle('active', p.dataset.vpanel === tab)
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     CONTACTS — search + list
     ══════════════════════════════════════════════════════════════════════════ */
  let searchTimer = null;

  function bindContactSearch() {
    const inp = $('vaultContactSearch');
    if (!inp) return;

    inp.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = inp.value.trim();

      if (q.length < 3) {
        renderContactsEmpty('Search phone or username (min 3 chars)');
        return;
      }

      searchTimer = setTimeout(() => searchContacts(q), 400);
    });
  }

  async function searchContacts(q) {
    try {
      const res = await API.request('/api/conversations/users/search?q=' + encodeURIComponent(q));
      state.contacts = res.users || [];
      renderContactsList();
    } catch (err) {
      console.error(err);
      renderContactsEmpty('Search failed');
    }
  }

  function renderContactsEmpty(msg) {
    const el = $('vaultContactList');
    if (!el) return;
    el.innerHTML = `
      <div class="vault-empty-list">
        <span>🔍</span>
        <p>${esc(msg)}</p>
      </div>`;
  }

  function renderContactsList() {
    const el = $('vaultContactList');
    if (!el) return;

    if (!state.contacts.length) {
      renderContactsEmpty('No users found');
      return;
    }

    el.innerHTML = state.contacts.map((u) => `
      <div class="vault-item" data-user-id="${u._id}">
        <div class="vault-item-avatar">${esc(initials(u.name))}</div>
        <div class="vault-item-info">
          <div class="vault-item-name">${esc(u.name)}</div>
          <div class="vault-item-sub">${esc(u.phone || u.username || u.role || '')}</div>
        </div>
      </div>
    `).join('');

    el.querySelectorAll('.vault-item').forEach((item) => {
      item.addEventListener('click', () => openContact(item.dataset.userId));
    });
  }

  async function loadConversations() {
    try {
      const res = await API.request('/api/conversations');
      // Prepended to contact list by default (as "recent chats")
      // We'll just leave this loaded; not displaying separately for now
      state.conversations = res.conversations || [];
    } catch (err) {
      console.warn('Load conversations failed:', err.message);
    }
  }

  async function openContact(userId) {
    try {
      const user = state.contacts.find((u) => u._id === userId);
      if (!user) return;

      const res = await API.request('/api/conversations/with/' + userId, { method: 'POST' });
      const convo = res.conversation;

      state.activeChat = {
        type: 'contact',
        id: convo._id,
        userId: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        online: true,
      };

      showChatPanel();
      await loadMessages();
      subscribeToConversation(convo._id);
    } catch (err) {
      console.error(err);
      toast(err.message || 'Failed to open chat', 'error');
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ROOMS — create / join / list
     ══════════════════════════════════════════════════════════════════════════ */
  async function loadRooms() {
    try {
      const res = await API.request('/api/rooms');
      state.rooms = res.rooms || [];
      renderRoomsList();
    } catch (err) {
      console.error(err);
    }
  }

  function renderRoomsList() {
    const el = $('vaultRoomList');
    if (!el) return;

    if (!state.rooms.length) {
      el.innerHTML = `
        <div class="vault-empty-list">
          <span>🔗</span>
          <p>No rooms yet. Create one or join with a code.</p>
        </div>`;
      return;
    }

    el.innerHTML = state.rooms.map((r) => `
      <div class="vault-item" data-room-id="${r._id}">
        <div class="vault-item-avatar">#</div>
        <div class="vault-item-info">
          <div class="vault-item-name">${esc(r.code)}</div>
          <div class="vault-item-sub">${r.messageCount || 0} messages</div>
        </div>
      </div>
    `).join('');

    el.querySelectorAll('.vault-item').forEach((item) => {
      item.addEventListener('click', () => openRoom(item.dataset.roomId));
    });
  }

  async function createRoom() {
    try {
      const res = await API.request('/api/rooms', { method: 'POST', body: { name: '' } });
      const room = res.room;
      toast('Room created: ' + room.code + ' ✓', 'success');
      await loadRooms();
      openRoom(room._id);
    } catch (err) {
      console.error(err);
      toast(err.message || 'Failed to create room', 'error');
    }
  }

  async function joinRoom() {
    const inp = $('vaultJoinCode');
    if (!inp) return;
    const code = inp.value.trim().toUpperCase();
    if (!code) return toast('Enter a room code', 'error');

    try {
      const res = await API.request('/api/rooms/join', { method: 'POST', body: { code } });
      inp.value = '';
      toast('Joined room ✓', 'success');
      await loadRooms();
      openRoom(res.room._id);
    } catch (err) {
      console.error(err);
      toast(err.message || 'Room not found', 'error');
    }
  }

  async function openRoom(roomId) {
    const room = state.rooms.find((r) => r._id === roomId);
    if (!room) return;

    state.activeChat = {
      type: 'room',
      id: room._id,
      name: room.code,
      status: 'Room',
    };

    showChatPanel();
    await loadMessages();
    subscribeToRoom(room._id);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     CHAT PANEL
     ══════════════════════════════════════════════════════════════════════════ */
  function showChatPanel() {
    const vault = $('chatVault');
    if (!vault) return;

    // Mobile: switch panes
    vault.classList.add('chat-open');

    $('vaultNoChat')?.classList.add('hidden');
    $('vaultChat')?.classList.remove('hidden');

    // Header
    const c = state.activeChat;
    if (!c) return;

    $('vaultChatAvatar').textContent = initials(c.name);
    $('vaultChatName').textContent = c.name;
    const statusEl = $('vaultChatStatus');
    if (c.type === 'contact') {
      statusEl.textContent = c.online ? 'Online' : 'Offline';
      statusEl.classList.toggle('online', !!c.online);
    } else {
      statusEl.textContent = 'Room';
      statusEl.classList.remove('online');
    }
  }

  function backToList() {
    const vault = $('chatVault');
    if (!vault) return;

    vault.classList.remove('chat-open');
    $('vaultChat')?.classList.add('hidden');
    $('vaultNoChat')?.classList.remove('hidden');
    state.activeChat = null;
    unsubscribeCurrent();
  }

  /* ══════════════════════════════════════════════════════════════════════════
     MESSAGES — load + render + send
     ══════════════════════════════════════════════════════════════════════════ */
  async function loadMessages() {
    const c = state.activeChat;
    if (!c) return;

    const el = $('vaultMessages');
    el.innerHTML = '<div class="vault-msg-system">Loading messages…</div>';

    try {
      const path = c.type === 'contact'
        ? '/api/conversations/' + c.id + '/messages'
        : '/api/rooms/' + c.id + '/messages';

      const res = await API.request(path);
      const messages = res.messages || [];

      if (!messages.length) {
        el.innerHTML = '<div class="vault-msg-system">No messages yet. Say hi! 👋</div>';
        return;
      }

      const meId = (API.User.get() || {})._id;
      el.innerHTML = messages.map((m) => renderMessage(m, meId)).join('');
      scrollBottom();
    } catch (err) {
      console.error(err);
      el.innerHTML = '<div class="vault-msg-system">Failed to load messages</div>';
    }
  }

  function renderMessage(m, meId) {
    if (m.type === 'system') {
      return `<div class="vault-msg-system">${esc(m.text)}</div>`;
    }

    const isMine = m.sender === meId || (m.sender && m.sender._id === meId);
    const dir = isMine ? 'out' : 'in';
    return `
      <div class="vault-msg ${dir}">
        <span class="vault-msg-text">${esc(m.text)}</span>
        <span class="vault-msg-time">${timeStr(m.createdAt || m.timestamp)}</span>
      </div>`;
  }

  function appendMessage(m) {
    const el = $('vaultMessages');
    const meId = (API.User.get() || {})._id;
    el.insertAdjacentHTML('beforeend', renderMessage(m, meId));
    scrollBottom();
  }

  function scrollBottom() {
    const el = $('vaultMessages');
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }

  async function sendMessage() {
    const inp = $('vaultMessageInput');
    const c = state.activeChat;
    if (!inp || !c) return;

    const text = inp.value.trim();
    if (!text) return;

    inp.value = '';

    // Optimistic render
    const me = API.User.get() || {};
    appendMessage({
      text,
      type: 'text',
      sender: me._id,
      createdAt: new Date().toISOString(),
    });

    try {
      if (c.type === 'contact') {
        // Prefer socket; fallback to REST
        if (state.socket && state.socket.connected) {
          state.socket.emit('dm:send', { conversationId: c.id, text });
        } else {
          await API.request('/api/conversations/' + c.id + '/messages', {
            method: 'POST', body: { text }
          });
        }
      } else {
        if (state.socket && state.socket.connected) {
          state.socket.emit('message:send', { roomId: c.id, text });
        } else {
          await API.request('/api/rooms/' + c.id + '/messages', {
            method: 'POST', body: { text }
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast('Failed to send', 'error');
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     SOCKET
     ══════════════════════════════════════════════════════════════════════════ */
  async function ensureSocket() {
    if (state.socket && state.socket.connected) return state.socket;
    if (!window.SocketClient) return null;

    try {
      const s = await SocketClient.init();
      state.socket = s;

      if (s) {
        s.on('message:new', (msg) => {
          const c = state.activeChat;
          if (c && c.type === 'room' && msg.room === c.id) {
            appendMessage(msg);
          }
        });

        s.on('dm:new', (msg) => {
          const c = state.activeChat;
          if (c && c.type === 'contact' && msg.conversation === c.id) {
            appendMessage(msg);
          }
        });
      }
      return s;
    } catch (err) {
      console.warn('Socket init failed:', err.message);
      return null;
    }
  }

  function subscribeToRoom(roomId) {
    if (state.socket && state.socket.connected) {
      state.socket.emit('room:join', { roomId });
    }
  }

  function subscribeToConversation(convoId) {
    if (state.socket && state.socket.connected) {
      state.socket.emit('dm:join', { conversationId: convoId });
    }
  }

  function unsubscribeCurrent() {
    // Optional cleanup
  }

  /* ══════════════════════════════════════════════════════════════════════════
     SECRET CODE TRIGGER (search bar of parent page)
     ══════════════════════════════════════════════════════════════════════════ */
  function bindSecretTrigger() {
    const inp = $('secretVector');
    if (!inp) return;

    let secret = '';
    try {
      secret = (localStorage.getItem('nexus_secret_code') || '').trim().toLowerCase();
    } catch (e) {}

    if (!secret) return;

    const check = () => {
      if ((inp.value || '').trim().toLowerCase() === secret) {
        inp.value = '';
        inp.blur();
        openVault();
      }
    };

    inp.addEventListener('input', check);
    inp.addEventListener('keyup', check);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     BIND EVENTS
     ══════════════════════════════════════════════════════════════════════════ */
  function bindEvents() {
    $('vaultExitBtn')?.addEventListener('click', closeVault);
    $('vaultBackBtn')?.addEventListener('click', () => {
      // On mobile: if chat open, close chat; else close vault
      if (state.activeChat) backToList();
      else closeVault();
    });
    $('vaultChatBack')?.addEventListener('click', backToList);

    document.querySelectorAll('.vault-tab').forEach((b) => {
      b.addEventListener('click', () => switchTab(b.dataset.vtab));
    });

    $('vaultCreateRoomBtn')?.addEventListener('click', createRoom);
    $('vaultJoinRoomBtn')?.addEventListener('click', joinRoom);

    const joinInp = $('vaultJoinCode');
    joinInp?.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    });
    joinInp?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); joinRoom(); }
    });

    $('vaultSendBtn')?.addEventListener('click', sendMessage);
    $('vaultMessageInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    bindContactSearch();
  }

  /* ══════════════════════════════════════════════════════════════════════════
     PUBLIC API
     ══════════════════════════════════════════════════════════════════════════ */
  window.VaultModule = {
    open: openVault,
    close: closeVault,
    switchTab,
  };

  /* ══════════════════════════════════════════════════════════════════════════
     INIT
     ══════════════════════════════════════════════════════════════════════════ */
  function init() {
    if (!$('chatVault')) {
      console.warn('[Vault] HTML not found — did you paste vault.html?');
      return;
    }

    bindSecretTrigger();
    bindEvents();
    ensureSocket(); // try to connect in background

    console.log('%c🔒 Vault ready', 'color:#22d3ee;font-weight:bold');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);