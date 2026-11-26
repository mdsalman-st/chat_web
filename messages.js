/* ============================================================================
   MESSAGES.JS — Role-Adaptive Contacts & Chat
   ============================================================================ */

(function () {
  'use strict';

  const KEYS = {
    ROLE:'nexus_user_role', USER:'nexus_user', USERNAME:'nexus_username', SECRET:'nexus_secret_code',
  };

  const state = {
    role:'student', user:{}, username:'', secret:'',
    vaultOpen:false, seeded:false,
    activeContactId: null,
    contactSearch: '',
  };

  /* ---------- Role-Based Contacts (No Fake Data) ---------- */
  const ROLE_CONTACTS = {};
  const ROLE_SEEDS = { default: {} };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- Toast ---------- */
  function toast(msg, type='info') {
    const t = document.createElement('div');
    t.className = 'toast show';
    t.textContent = msg;
    t.style.background = type==='error'?'#dc2626':type==='success'?'#059669':'#111827';
    document.body.appendChild(t);
    requestAnimationFrame(()=>t.classList.add('show'));
    setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),350); }, 2200);
  }
  window.toast = toast;

  /* ---------- Storage ---------- */
  function msgKey() {
    const u = state.username || state.user.email || 'default';
    return 'nexus_messages_' + u;
  }
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(msgKey()) || '{}'); }
    catch(e){ return {}; }
  }
  function saveStore(store) {
    try { localStorage.setItem(msgKey(), JSON.stringify(store)); }
    catch(e){ console.warn(e); }
  }

  /* ---------- Data Helpers ---------- */
  function getContacts() {
    return ROLE_CONTACTS[state.role] || [];
  }

  function seedIfEmpty(contactId) {
    const store = loadStore();
    return store[contactId] || [];
  }

  function getMessages(contactId) {
    const store = loadStore();
    return store[contactId] || seedIfEmpty(contactId);
  }

  function saveMessages(contactId, messages) {
    const store = loadStore();
    store[contactId] = messages;
    saveStore(store);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const diff = now - d;
    if (diff < 7 * 86400000) {
      return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    }
    return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  }

  /* ---------- Render Contacts ---------- */
  function renderContacts() {
    const list = $('contactsList');
    const contacts = getContacts();
    const store = loadStore();

    const q = state.contactSearch.toLowerCase().trim();
    const filtered = contacts.filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      list.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">No contacts found</div>`;
      return;
    }

    list.innerHTML = filtered.map(c => {
      const msgs = store[c.id] || [];
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter(m => m.type === 'in' && !m.read).length;
      const preview = last ? (last.type === 'out' ? 'You: ' : '') + last.text : 'No messages yet';
      const time = last ? formatTime(last.timestamp) : '';

      return `<div class="contact-item ${state.activeContactId === c.id ? 'active' : ''}" data-id="${c.id}">
        <div class="contact-avatar" style="background:linear-gradient(135deg,${c.color},${c.color}aa)">
          ${c.icon}
          ${c.online ? '<span class="online-dot"></span>' : ''}
        </div>
        <div class="contact-meta">
          <div class="contact-name">${esc(c.name)}</div>
          <div class="contact-preview">${esc(preview).slice(0, 45)}${preview.length > 45 ? '…' : ''}</div>
        </div>
        <div class="contact-side">
          <span class="contact-time">${time}</span>
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
        </div>
      </div>`;
    }).join('');

    // Attach click handlers
    list.querySelectorAll('.contact-item').forEach(el => {
      el.addEventListener('click', () => openContact(el.dataset.id));
    });

    // Update online count
    const online = contacts.filter(c => c.online).length;
    $('onlineCount').textContent = online + ' online';

    // Update nav unread
    let totalUnread = 0;
    contacts.forEach(c => {
      const msgs = store[c.id] || [];
      totalUnread += msgs.filter(m => m.type === 'in' && !m.read).length;
    });
    const navEl = $('navUnread');
    if (navEl) {
      navEl.textContent = totalUnread;
      navEl.style.display = totalUnread > 0 ? '' : 'none';
    }
  }

  /* ---------- Open Contact ---------- */
  function openContact(id) {
    state.activeContactId = id;
    const contact = getContacts().find(c => c.id === id);
    if (!contact) return;

    // Mark as read
    const msgs = getMessages(id);
    msgs.forEach(m => { if (m.type === 'in') m.read = true; });
    saveMessages(id, msgs);

    renderContacts();
    renderChat();
  }

  /* ---------- Render Chat ---------- */
  function renderChat() {
    const panel = $('chatPanel');

    if (!state.activeContactId) {
      panel.innerHTML = `<div class="empty-chat">
        <div class="empty-chat-icon">💬</div>
        <h3 class="text-base font-bold text-white mb-1">Select a contact</h3>
        <p class="text-xs text-slate-500">Choose from the list to start chatting</p>
      </div>`;
      return;
    }

    const contact = getContacts().find(c => c.id === state.activeContactId);
    if (!contact) return;

    const messages = getMessages(contact.id);

    panel.innerHTML = `
      <div class="chat-header">
        <div class="contact-avatar" style="background:linear-gradient(135deg,${contact.color},${contact.color}aa)">
          ${contact.icon}
          ${contact.online ? '<span class="online-dot"></span>' : ''}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-white truncate">${esc(contact.name)}</p>
          <p class="text-[11px] ${contact.online ? 'text-green-400' : 'text-slate-500'} truncate">${contact.online ? '● Online' : '○ Offline'} · ${esc(contact.role)}</p>
        </div>
      </div>

      <div class="chat-feed" id="chatFeed"></div>

      <div class="chat-composer">
        <input type="text" id="chatInput" placeholder="Type a message…" autocomplete="off" maxlength="500">
        <button class="send-btn" id="chatSend" aria-label="Send">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `;

    const feed = $('chatFeed');
    feed.innerHTML = messages.map(m => `
      <div class="bubble ${m.type}">
        ${esc(m.text)}
        <span class="bubble-time">${formatTime(m.timestamp)}</span>
      </div>
    `).join('');

    requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });

    $('chatInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    $('chatSend').addEventListener('click', sendMessage);
    setTimeout(() => $('chatInput').focus(), 50);
  }

  /* ---------- Send Message ---------- */
  function sendMessage() {
    const input = $('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const id = state.activeContactId;
    if (!id) return;

    const msgs = getMessages(id);
    msgs.push({
      id: 'msg_' + Date.now(),
      text, type: 'out',
      timestamp: Date.now(),
    });
    saveMessages(id, msgs);
    input.value = '';

    renderChat();
    renderContacts();

    // Simulate reply
    const contact = getContacts().find(c => c.id === id);
    if (contact && contact.online) {
      setTimeout(() => showTyping(id), 500);
      setTimeout(() => {
        hideTyping();
        simulateReply(id, text);
      }, 1800 + Math.random() * 1200);
    }
  }

  function showTyping(contactId) {
    if (state.activeContactId !== contactId) return;
    const feed = $('chatFeed');
    if (!feed || $('typingIndicator')) return;
    const el = document.createElement('div');
    el.id = 'typingIndicator';
    el.className = 'typing-indicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    feed.appendChild(el);
    feed.scrollTop = feed.scrollHeight;
  }

  function hideTyping() {
    const el = $('typingIndicator');
    if (el) el.remove();
  }

  function simulateReply(contactId, userText) {
    const replies = [
      'Got it 👍', 'Sure thing!', 'On it.', 'Sounds good!',
      'Okay, will check.', 'Thanks for the update!', 'Interesting 👀',
      'Noted 📝', 'Cool, talk later!', 'Perfect!',
    ];
    const text = replies[Math.floor(Math.random() * replies.length)];

    const msgs = getMessages(contactId);
    msgs.push({
      id: 'msg_' + Date.now(),
      text, type: 'in',
      timestamp: Date.now(),
      read: state.activeContactId === contactId,
    });
    saveMessages(contactId, msgs);

    if (state.activeContactId === contactId) {
      renderChat();
    }
    renderContacts();
  }

  /* ---------- Sidebar / Dropdowns / Vault ---------- */
  window.toggleSidebar = function() {
    $('sidebar').classList.toggle('open');
    $('sidebarBackdrop').classList.toggle('hidden');
  };

  window.handleLogout = function() {
    if (!confirm('Sign out and clear session?')) return;
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    window.location.href = 'index.html';
  };

  function bindDropdowns() {
    const nB = $('notifBtn'), nP = $('notifPanel');
    const pB = $('profileBtn'), pP = $('profilePanel');
    const close = () => { nP.classList.add('hidden'); pP.classList.add('hidden'); };
    nB.addEventListener('click', e => { e.stopPropagation(); pP.classList.add('hidden'); nP.classList.toggle('hidden'); });
    pB.addEventListener('click', e => { e.stopPropagation(); nP.classList.add('hidden'); pP.classList.toggle('hidden'); });
    document.addEventListener('click', close);
    [nP, pP].forEach(p => p.addEventListener('click', e => e.stopPropagation()));
  }

  function bindSecret() {
    const inp = $('secretVector'); if (!inp || !state.secret) return;
    const check = () => {
      if ((inp.value||'').trim().toLowerCase() === state.secret) {
        inp.value=''; inp.blur(); openVault();
      }
    };
    inp.addEventListener('input', check);
    inp.addEventListener('keyup', check);
  }

  function openVault() {
    $('chatVault').classList.remove('vault-hidden');
    state.vaultOpen = true;
    document.body.style.overflow = 'hidden';
    if (!state.seeded && $('vaultFeed').children.length === 0) {
      appendVaultMsg('Secure channel established. All messages are volatile and session-bound.', 'incoming', 'System');
      state.seeded = true;
    }
    setTimeout(() => $('vaultInput').focus(), 100);
  }
  function closeVault() {
    $('chatVault').classList.add('vault-hidden');
    state.vaultOpen = false;
    document.body.style.overflow = '';
    $('vaultInput').value = '';
  }
  function appendVaultMsg(text, type='outgoing', sender='') {
    if (!text.trim()) return;
    const b = document.createElement('div');
    b.className = `msg-bubble ${type}`;
    const s = document.createElement('span'); s.className='msg-text'; s.textContent = text; b.appendChild(s);
    const tm = document.createElement('span'); tm.className='msg-time';
    const now = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    tm.textContent = sender ? `${sender} • ${now}` : now;
    b.appendChild(tm);
    $('vaultFeed').appendChild(b);
    requestAnimationFrame(() => $('vaultCanvas').scrollTop = $('vaultCanvas').scrollHeight);
  }
  function sendVaultMsg() {
    const inp = $('vaultInput'); const text = inp.value.trim(); if (!text) return;
    appendVaultMsg(text, 'outgoing'); inp.value=''; inp.focus();
    setTimeout(() => { if (state.vaultOpen) appendVaultMsg('Message encrypted & relayed. Volatile session active.', 'incoming', 'Relay'); }, 650);
  }
  function bindVault() {
    $('exitVaultBtn').addEventListener('click', closeVault);
    $('vaultSend').addEventListener('click', sendVaultMsg);
    $('vaultInput').addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendVaultMsg(); } });
  }
  function bindAntiForensic() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.vaultOpen) {
        $('vaultFeed').innerHTML = '';
        closeVault();
        window.location.reload();
      }
    });
  }

  /* ---------- Particles ---------- */
  (function particles() {
    const wrap = $('particles'); if (!wrap) return;
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.style.left = Math.random()*100+'%';
      p.style.top = (100+Math.random()*20)+'%';
      p.style.animationDuration = (16+Math.random()*18)+'s';
      p.style.animationDelay = (-Math.random()*25)+'s';
      const s = 1+Math.random()*2;
      p.style.width = s+'px'; p.style.height = s+'px';
      wrap.appendChild(p);
    }
  })();

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    try {
      state.role = localStorage.getItem(KEYS.ROLE) || 'student';
      state.user = JSON.parse(localStorage.getItem(KEYS.USER) || '{}');
      state.username = localStorage.getItem(KEYS.USERNAME) || '';
      state.secret = (localStorage.getItem(KEYS.SECRET) || '').trim().toLowerCase();
    } catch(e){}

    const name = (state.user.name || state.username || 'User').split(' ')[0];
    $('avatarLetter').textContent = name.charAt(0).toUpperCase();
    $('profileName').textContent = name;
    $('panelName').textContent = state.user.name || 'User';
    $('panelEmail').textContent = state.user.email || 'user@example.com';
    $('sideRoleTag').textContent = state.role;

    // Seed contact list lazily (so previews appear)
    getContacts().forEach(c => seedIfEmpty(c.id));

    renderContacts();
    renderChat();

    // Contact search
    $('contactSearch').addEventListener('input', e => {
      state.contactSearch = e.target.value;
      renderContacts();
    });

    bindDropdowns();
    bindSecret();
    bindVault();
    bindAntiForensic();

    console.log('%c✅ MESSAGES READY (role:', 'color:#22d3ee;font-weight:bold', state.role + ')');
  });

})();