/* ============================================================================
   NOTES.JS — Full Notes Manager (Role-Adaptive)
   ============================================================================ */

(function () {
  'use strict';

  const KEYS = {
    ROLE:'nexus_user_role', USER:'nexus_user', USERNAME:'nexus_username', SECRET:'nexus_secret_code',
  };

  const COLORS = ['yellow', 'blue', 'green', 'pink', 'purple', 'gray'];

  const state = {
    role:'student', user:{}, username:'', secret:'',
    vaultOpen:false, seeded:false,
  };

  /* ---------- Role-Specific Note Tag ---------- */
  const ROLE_NOTE_FIELD = {
    student:    { label:'Subject',    placeholder:'e.g. Physics' },
    employee:   { label:'Department', placeholder:'e.g. Marketing' },
    trader:     { label:'Strategy',   placeholder:'e.g. Swing Trade' },
    creator:    { label:'Content Topic', placeholder:'e.g. Productivity' },
    developer:  { label:'Project',    placeholder:'e.g. nexus-core' },
    freelancer: { label:'Client',     placeholder:'e.g. Acme Inc' },
    teacher:    { label:'Class',      placeholder:'e.g. Class 10-A' },
    doctor:     { label:'Patient',    placeholder:'e.g. Ravi Kumar' },
    other:      { label:'Tag',        placeholder:'e.g. Ideas, Personal' },
  };

  const noteState = {
    list: [],
    search: '',
    colorFilter: 'all',
    sort: 'updated',
    view: 'grid',
    editingId: null,
    currentColor: 'yellow',
    roleTagValue: '',
  };

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
  function noteKey() {
    const u = state.username || state.user.email || 'default';
    return 'nexus_notes_' + u;
  }
  function loadNotes() {
    try { noteState.list = JSON.parse(localStorage.getItem(noteKey()) || '[]'); }
    catch(e){ noteState.list = []; }
  }
  function saveNotes() {
    try { localStorage.setItem(noteKey(), JSON.stringify(noteState.list)); }
    catch(e){ console.warn(e); }
  }

  /* ---------- Helpers ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const d = Math.floor(hr / 24);
    if (d < 7) return d + 'd ago';
    return new Date(ts).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  }

  /* ---------- Stats ---------- */
  function renderStats() {
    const el = $('noteStats'); if (!el) return;

    const total = noteState.list.length;
    const pinned = noteState.list.filter(n => n.pinned).length;
    const colors = new Set(noteState.list.map(n => n.color)).size;
    const thisWeek = noteState.list.filter(n => Date.now() - n.createdAt < 7 * 86400000).length;

    const stats = [
      { label:'Total Notes', value: total,   icon:'📝', color:'cyan' },
      { label:'Pinned',      value: pinned,  icon:'📌', color:'amber' },
      { label:'This Week',   value: thisWeek, icon:'✨', color:'green' },
      { label:'Color Tags',  value: colors,  icon:'🎨', color:'violet' },
    ];

    const C = {
      cyan:{ bg:'from-cyan-500/15 to-cyan-500/[0.03]', text:'text-cyan-300', border:'border-cyan-500/20' },
      amber:{ bg:'from-amber-500/15 to-amber-500/[0.03]', text:'text-amber-300', border:'border-amber-500/20' },
      green:{ bg:'from-emerald-500/15 to-emerald-500/[0.03]', text:'text-emerald-300', border:'border-emerald-500/20' },
      violet:{ bg:'from-violet-500/15 to-violet-500/[0.03]', text:'text-violet-300', border:'border-violet-500/20' },
    };

    el.innerHTML = stats.map(s => {
      const c = C[s.color];
      return `<div class="nx-card p-4 bg-gradient-to-br ${c.bg} border ${c.border}">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] font-bold uppercase tracking-[0.15em] ${c.text}">${s.label}</p>
          <span class="text-base">${s.icon}</span>
        </div>
        <p class="text-2xl font-black text-white leading-none">${s.value}</p>
      </div>`;
    }).join('');
  }

  /* ---------- Filter / Sort ---------- */
  function visible() {
    let list = [...noteState.list];

    if (noteState.colorFilter !== 'all') {
      list = list.filter(n => n.color === noteState.colorFilter);
    }

    const q = noteState.search.toLowerCase().trim();
    if (q) {
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q) ||
        (n.roleTag || '').toLowerCase().includes(q)
      );
    }

    const s = noteState.sort;
    if (s === 'updated') list.sort((a,b) => b.updatedAt - a.updatedAt);
    else if (s === 'created') list.sort((a,b) => b.createdAt - a.createdAt);
    else if (s === 'title') list.sort((a,b) => a.title.localeCompare(b.title));

    list.sort((a,b) => Number(b.pinned || 0) - Number(a.pinned || 0));

    return list;
  }

  /* ---------- Render Notes ---------- */
  function renderNotes() {
    const el = $('notesContainer'); if (!el) return;

    el.className = 'notes-grid anim anim-5' + (noteState.view === 'list' ? ' list-view' : '');

    const list = visible();

    if (list.length === 0) {
      const isEmpty = noteState.list.length === 0;
      el.innerHTML = `<div class="notes-empty">
        <div class="notes-empty-icon">${isEmpty ? '📝' : '🔍'}</div>
        <h3 class="text-lg font-bold text-white mb-1">${isEmpty ? 'No notes yet' : 'No matching notes'}</h3>
        <p class="text-sm text-slate-400 mb-5">${isEmpty ? 'Click "New Note" to write your first one.' : 'Try changing filters or search.'}</p>
        ${isEmpty ? `<button onclick="openNoteModal()" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm hover:-translate-y-0.5 transition-all">+ Write First Note</button>` : ''}
      </div>`;
      return;
    }

    el.innerHTML = list.map(n => `
      <div class="note-card note-color-${n.color} ${n.pinned ? 'pinned' : ''}" data-id="${n.id}">
        <button class="note-pin" onclick="event.stopPropagation(); togglePin('${n.id}')" title="${n.pinned ? 'Unpin' : 'Pin'}">
          <svg width="12" height="12" fill="${n.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
        </button>

        <div onclick="openNoteModal('${n.id}')" style="flex:1; display:flex; flex-direction:column">
          <div class="note-title">${esc(n.title)}</div>
          ${n.content ? `<div class="note-content">${esc(n.content)}</div>` : ''}
          <div class="note-footer">
            ${n.roleTag ? `<span style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.15rem 0.5rem;border-radius:6px;font-size:0.65rem;font-weight:700;background:rgba(139,92,246,0.15);color:#c4b5fd;border:1px solid rgba(139,92,246,0.25);text-transform:uppercase;letter-spacing:0.03em">${esc(n.roleTag)}</span>` : ''}
            <span class="note-time">${timeAgo(n.updatedAt)}</span>
          </div>
        </div>

        <button class="note-delete" onclick="event.stopPropagation(); deleteNote('${n.id}')" title="Delete">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/></svg>
        </button>
      </div>
    `).join('');
  }

  function refresh() { renderStats(); renderNotes(); }

  /* ---------- Actions ---------- */
  window.togglePin = function(id) {
    const n = noteState.list.find(x => x.id === id); if (!n) return;
    n.pinned = !n.pinned;
    n.updatedAt = Date.now();
    saveNotes(); refresh();
    toast(n.pinned ? 'Pinned 📌' : 'Unpinned', 'success');
  };

  window.deleteNote = function(id) {
    if (!confirm('Delete this note?')) return;
    noteState.list = noteState.list.filter(x => x.id !== id);
    saveNotes(); refresh();
    toast('Note deleted', 'success');
  };

  window.setColorFilter = function(color) {
    noteState.colorFilter = color;
    document.querySelectorAll('.filter-color-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.color === color)
    );
    renderNotes();
  };

  window.setView = function(view) {
    noteState.view = view;
    document.querySelectorAll('.view-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view === view)
    );
    renderNotes();
  };

  /* ---------- Modal ---------- */
  function ensureModal() {
    if ($('noteModal')) return;

    const swatches = COLORS.map(c => {
      const map = { yellow:'#f59e0b', blue:'#3b82f6', green:'#22c55e', pink:'#ec4899', purple:'#8b5cf6', gray:'#94a3b8' };
      return `<button type="button" class="color-swatch" data-color="${c}" style="background:${map[c]}" onclick="setNoteColor('${c}')"></button>`;
    }).join('');

    const roleCfg = ROLE_NOTE_FIELD[state.role] || ROLE_NOTE_FIELD.other;

    const html = `
    <div id="noteModal" class="modal-overlay hidden">
      <div class="modal-box">
        <div class="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 id="noteModalTitle" class="text-lg font-black text-white">New Note</h2>
            <p class="text-[11px] text-slate-500">Write down your thoughts</p>
          </div>
          <button onclick="closeNoteModal()" class="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Title *</label>
            <input type="text" id="noteTitle" maxlength="100" placeholder="Note title…"
                   class="w-full px-4 py-3 rounded-xl bg-ink-950/60 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all">
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Content</label>
            <textarea id="noteContent" rows="6" maxlength="4000" placeholder="Start writing…"
                      class="w-full px-4 py-3 rounded-xl bg-ink-950/60 border border-white/10 text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all leading-relaxed"></textarea>
            <p class="text-[10px] text-slate-500 mt-1.5"><span id="noteCharCount">0</span> / 4000 characters</p>
          </div>
          <div>
            <label id="noteTagLabel" class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">${roleCfg.label}</label>
            <input type="text" id="noteRoleField" maxlength="40" placeholder="${roleCfg.placeholder}"
                   class="w-full px-4 py-3 rounded-xl bg-ink-950/60 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all">
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Color Tag</label>
            <div class="color-picker">${swatches}</div>
          </div>
        </div>
        <div class="p-5 border-t border-white/[0.06] flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button onclick="closeNoteModal()" class="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-sm font-semibold transition-all">Cancel</button>
          <button id="noteSaveBtn" onclick="saveNoteFromModal()" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm hover:-translate-y-0.5 transition-all shadow-[0_15px_40px_-10px_rgba(34,211,238,0.5)]">Save Note</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    $('noteContent').addEventListener('input', e => {
      $('noteCharCount').textContent = e.target.value.length;
    });

    $('noteTitle').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); $('noteContent').focus(); }
    });
  }

  window.setNoteColor = function(color) {
    noteState.currentColor = color;
    document.querySelectorAll('.color-swatch').forEach(s =>
      s.classList.toggle('active', s.dataset.color === color)
    );
  };

  window.openNoteModal = function(id) {
    ensureModal();
    noteState.editingId = id || null;
    const n = id ? noteState.list.find(x => x.id === id) : null;

    $('noteModalTitle').textContent = id ? 'Edit Note' : 'New Note';
    $('noteTitle').value = n ? n.title : '';
    $('noteContent').value = n ? (n.content || '') : '';
    $('noteCharCount').textContent = n ? (n.content || '').length : 0;
    setNoteColor(n ? n.color : 'yellow');
    $('noteSaveBtn').textContent = id ? 'Update Note' : 'Save Note';

    const rf = $('noteRoleField');
    if (rf) rf.value = n ? (n.roleTag || '') : '';

    $('noteModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('noteTitle').focus(), 100);
  };

  window.closeNoteModal = function() {
    const m = $('noteModal'); if (m) m.classList.add('hidden');
    document.body.style.overflow = '';
    noteState.editingId = null;
  };

  window.saveNoteFromModal = function() {
    const title = $('noteTitle').value.trim();
    const content = $('noteContent').value.trim();
    const roleTag = ($('noteRoleField') ? $('noteRoleField').value.trim() : '');

    if (!title) {
      toast('Please enter a note title', 'error');
      $('noteTitle').focus();
      return;
    }

    if (noteState.editingId) {
      const n = noteState.list.find(x => x.id === noteState.editingId);
      if (n) {
        n.title = title;
        n.content = content;
        n.color = noteState.currentColor;
        n.roleTag = roleTag;
        n.updatedAt = Date.now();
      }
      toast('Note updated ✓', 'success');
    } else {
      noteState.list.unshift({
        id: uid(),
        title, content,
        color: noteState.currentColor,
        roleTag,
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      toast('Note saved ✓', 'success');
    }

    saveNotes();
    closeNoteModal();
    refresh();
  };

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
      appendMsg('Secure channel established. All messages are volatile and session-bound.', 'incoming', 'System');
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
  function appendMsg(text, type='outgoing', sender='') {
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
  function sendMsg() {
    const inp = $('vaultInput'); const text = inp.value.trim(); if (!text) return;
    appendMsg(text, 'outgoing'); inp.value=''; inp.focus();
    setTimeout(() => { if (state.vaultOpen) appendMsg('Message encrypted & relayed. Volatile session active.', 'incoming', 'Relay'); }, 650);
  }
  function bindVault() {
    $('exitVaultBtn').addEventListener('click', closeVault);
    $('vaultSend').addEventListener('click', sendMsg);
    $('vaultInput').addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
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

    loadNotes();
    refresh();

    $('noteSearch').addEventListener('input', e => { noteState.search = e.target.value; renderNotes(); });
    $('noteSort').addEventListener('change', e => { noteState.sort = e.target.value; renderNotes(); });

    document.addEventListener('click', e => { if (e.target.id === 'noteModal') closeNoteModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('noteModal') && !$('noteModal').classList.contains('hidden')) closeNoteModal(); });

    bindDropdowns();
    bindSecret();
    bindVault();
    bindAntiForensic();

    console.log('%c✅ NOTES READY (role:', 'color:#22d3ee;font-weight:bold', state.role + ')');
  });

})();