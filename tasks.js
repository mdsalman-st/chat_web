/* ============================================================================
   TASKS.JS — Full Task Manager (Role-Adaptive)
   ============================================================================ */

(function () {
  'use strict';

  const KEYS = {
    ROLE:'nexus_user_role', USER:'nexus_user', USERNAME:'nexus_username', SECRET:'nexus_secret_code',
  };

  const state = {
    role:'student', user:{}, username:'', secret:'',
    vaultOpen:false, seeded:false,
  };

  const taskState = {
    list:[], filter:'all', search:'', sort:'date-asc',
    editingId:null, priority:'medium', roleFieldValue:'',
  };

  /* ---------- Role-Specific Task Field ---------- */
  const ROLE_TASK_FIELD = {
    student:    { label:'Subject',  type:'select', icon:'📚',
                  options:['Physics','Math','Chemistry','Biology','Computer Science','English','Hindi','Social Studies','Other'] },
    employee:   { label:'Project',  type:'text',   icon:'💼', placeholder:'e.g. Q4 Report' },
    trader:     { label:'Symbol / Market', type:'text', icon:'📈', placeholder:'e.g. RELIANCE, NIFTY' },
    creator:    { label:'Platform', type:'select', icon:'🎨',
                  options:['YouTube','Instagram','TikTok','Twitter / X','LinkedIn','Blog','Podcast','Other'] },
    developer:  { label:'Project / Repo', type:'text', icon:'💻', placeholder:'e.g. nexus-core' },
    freelancer: { label:'Client',   type:'text',   icon:'🧑‍💻', placeholder:'e.g. Acme Inc' },
    teacher:    { label:'Class / Batch', type:'text', icon:'📚', placeholder:'e.g. Class 10-A' },
    doctor:     { label:'Patient / Ward', type:'text', icon:'🩺', placeholder:'e.g. Ravi Kumar' },
    other:      { label:'Category', type:'text',   icon:'✨', placeholder:'e.g. Personal, Work' },
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
  function taskKey() {
    const u = state.username || state.user.email || 'default';
    return 'nexus_tasks_' + u;
  }
  function loadTasks() {
    try { taskState.list = JSON.parse(localStorage.getItem(taskKey()) || '[]'); }
    catch(e){ taskState.list = []; }
  }
  function saveTasks() {
    try { localStorage.setItem(taskKey(), JSON.stringify(taskState.list)); }
    catch(e){ console.warn(e); }
  }

  /* ---------- Helpers ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const todayISO = () => new Date().toISOString().split('T')[0];
  const isOverdue = t => !t.completed && t.dueDate && t.dueDate < todayISO();

  function formatDue(d) {
    if (!d) return '';
    const date = new Date(d + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((date - today) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff < 0) return Math.abs(diff)+'d overdue';
    if (diff < 7) return 'In '+diff+' days';
    return date.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  }

  /* ---------- Stats ---------- */
  function renderStats() {
    const el = $('taskStats'); if (!el) return;
    const total = taskState.list.length;
    const done = taskState.list.filter(t=>t.completed).length;
    const pending = total - done;
    const overdue = taskState.list.filter(isOverdue).length;
    const stats = [
      { label:'Total',     value:total,   icon:'📋', color:'cyan' },
      { label:'Completed', value:done,    icon:'✅', color:'green' },
      { label:'Pending',   value:pending, icon:'⏳', color:'amber' },
      { label:'Overdue',   value:overdue, icon:'⚠️', color:'red' },
    ];
    const C = {
      cyan:{ bg:'from-cyan-500/15 to-cyan-500/[0.03]', text:'text-cyan-300', border:'border-cyan-500/20' },
      green:{ bg:'from-emerald-500/15 to-emerald-500/[0.03]', text:'text-emerald-300', border:'border-emerald-500/20' },
      amber:{ bg:'from-amber-500/15 to-amber-500/[0.03]', text:'text-amber-300', border:'border-amber-500/20' },
      red:{ bg:'from-red-500/15 to-red-500/[0.03]', text:'text-red-300', border:'border-red-500/20' },
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

  /* ---------- Filter/Sort ---------- */
  function visible() {
    let list = [...taskState.list];
    if (taskState.filter === 'active') list = list.filter(t=>!t.completed);
    if (taskState.filter === 'done')   list = list.filter(t=>t.completed);
    const q = taskState.search.toLowerCase().trim();
    if (q) list = list.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description||'').toLowerCase().includes(q) ||
      (t.roleValue||'').toLowerCase().includes(q)
    );
    const rank = { high:0, medium:1, low:2 };
    const s = taskState.sort;
    if (s === 'date-asc') list.sort((a,b) => { if (!a.dueDate&&!b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return a.dueDate.localeCompare(b.dueDate); });
    else if (s === 'date-desc') list.sort((a,b) => { if (!a.dueDate&&!b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return b.dueDate.localeCompare(a.dueDate); });
    else if (s === 'priority') list.sort((a,b) => (rank[a.priority]??3) - (rank[b.priority]??3));
    else if (s === 'created') list.sort((a,b) => b.createdAt - a.createdAt);
    list.sort((a,b) => Number(a.completed) - Number(b.completed));
    return list;
  }

  /* ---------- Render List ---------- */
  function renderList() {
    const el = $('taskList'); if (!el) return;
    const list = visible();

    if (list.length === 0) {
      const isEmpty = taskState.list.length === 0;
      el.innerHTML = `<div class="nx-card task-empty">
        <div class="task-empty-icon">${isEmpty?'🎯':'🔍'}</div>
        <h3 class="text-lg font-bold text-white mb-1">${isEmpty?'No tasks yet':'No matching tasks'}</h3>
        <p class="text-sm text-slate-400 mb-5">${isEmpty?'Click "New Task" to get started.':'Try changing filters or search.'}</p>
        ${isEmpty?`<button onclick="openTaskModal()" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm hover:-translate-y-0.5 transition-all">+ Add First Task</button>`:''}
      </div>`;
      return;
    }

    const roleCfg = ROLE_TASK_FIELD[state.role] || ROLE_TASK_FIELD.other;

    el.innerHTML = list.map(t => {
      const over = isOverdue(t);
      const due = formatDue(t.dueDate);
      const pl = t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
      return `<div class="task-row ${t.completed?'done':''}" data-id="${t.id}">
        <button class="task-checkbox" onclick="toggleTask('${t.id}')" aria-label="Toggle">✓</button>
        <div class="task-body" onclick="openTaskModal('${t.id}')" style="cursor:pointer">
          <div class="task-title">${esc(t.title)}</div>
          ${t.description?`<div class="text-xs text-slate-500 mb-2 truncate">${esc(t.description)}</div>`:''}
          <div class="task-meta">
            <span class="task-chip priority-${t.priority}">${pl}</span>
            ${t.roleValue ? `<span class="task-chip date" style="background:rgba(139,92,246,0.12);color:#c4b5fd;border-color:rgba(139,92,246,0.25)">${roleCfg.icon} ${esc(t.roleValue)}</span>` : ''}
            ${t.dueDate?`<span class="task-chip date ${over?'overdue':''}">📅 ${due}</span>`:''}
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn" onclick="event.stopPropagation(); openTaskModal('${t.id}')" title="Edit">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="task-action-btn danger" onclick="event.stopPropagation(); deleteTask('${t.id}')" title="Delete">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/></svg>
          </button>
        </div>
      </div>`;
    }).join('');
  }

  function refresh() { renderStats(); renderList(); }

  /* ---------- Actions ---------- */
  window.toggleTask = function(id) {
    const t = taskState.list.find(x => x.id === id); if (!t) return;
    t.completed = !t.completed;
    t.completedAt = t.completed ? Date.now() : null;
    saveTasks(); refresh();
    if (t.completed) toast('Task completed ✓', 'success');
  };

  window.deleteTask = function(id) {
    if (!confirm('Delete this task?')) return;
    taskState.list = taskState.list.filter(x => x.id !== id);
    saveTasks(); refresh();
    toast('Task deleted', 'success');
  };

  window.setTaskFilter = function(f) {
    taskState.filter = f;
    document.querySelectorAll('.task-filter').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
    renderList();
  };

  /* ---------- Modal ---------- */
  function ensureModal() {
    if ($('taskModal')) return;
    const html = `
    <div id="taskModal" class="modal-overlay hidden">
      <div class="modal-box">
        <div class="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 id="taskModalTitle" class="text-lg font-black text-white">New Task</h2>
            <p class="text-[11px] text-slate-500">Add details to stay organized</p>
          </div>
          <button onclick="closeTaskModal()" class="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Title *</label>
            <input type="text" id="taskTitle" maxlength="120" placeholder="e.g. Finish project report"
                   class="w-full px-4 py-3 rounded-xl bg-ink-950/60 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all">
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Description</label>
            <textarea id="taskDesc" rows="3" maxlength="400" placeholder="Add more details…"
                      class="w-full px-4 py-3 rounded-xl bg-ink-950/60 border border-white/10 text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"></textarea>
          </div>
          <div id="roleFieldWrap">
            <label id="roleFieldLabel" class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Subject</label>
            <div id="roleFieldInput"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Priority</label>
              <div class="flex gap-1.5">
                <button type="button" class="prio-btn flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all" data-prio="low">Low</button>
                <button type="button" class="prio-btn flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all" data-prio="medium">Medium</button>
                <button type="button" class="prio-btn flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all" data-prio="high">High</button>
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Due Date</label>
              <input type="date" id="taskDue"
                     class="w-full px-4 py-2.5 rounded-xl bg-ink-950/60 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all">
            </div>
          </div>
        </div>
        <div class="p-5 border-t border-white/[0.06] flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button onclick="closeTaskModal()" class="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-sm font-semibold transition-all">Cancel</button>
          <button id="taskSaveBtn" onclick="saveTaskFromModal()" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm hover:-translate-y-0.5 transition-all shadow-[0_15px_40px_-10px_rgba(34,211,238,0.5)]">Save Task</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    document.querySelectorAll('.prio-btn').forEach(b => b.addEventListener('click', () => setPriority(b.dataset.prio)));
    $('taskTitle').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); window.saveTaskFromModal(); } });

    // Build role-specific field
    buildRoleField();
  }

  /* ---------- Role-Specific Field ---------- */
  function buildRoleField() {
    const cfg = ROLE_TASK_FIELD[state.role] || ROLE_TASK_FIELD.other;
    const labelEl = $('roleFieldLabel');
    const inputWrap = $('roleFieldInput');

    if (!labelEl || !inputWrap) return;

    labelEl.textContent = cfg.label;

    if (cfg.type === 'select') {
      const options = cfg.options.map(o => `<option value="${o}">${o}</option>`).join('');
      inputWrap.innerHTML = `
        <select id="taskRoleField" class="w-full px-4 py-3 rounded-xl bg-ink-950/60 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all cursor-pointer custom-select">
          <option value="">— Select ${cfg.label} —</option>
          ${options}
        </select>`;
    } else {
      inputWrap.innerHTML = `
        <input type="text" id="taskRoleField" maxlength="60" placeholder="${cfg.placeholder || ''}"
          class="w-full px-4 py-3 rounded-xl bg-ink-950/60 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all">`;
    }
  }

  function setPriority(p) {
    taskState.priority = p;
    const styles = {
      low:    'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      high:   'bg-red-500/15 text-red-300 border-red-500/30',
    };
    document.querySelectorAll('.prio-btn').forEach(b => {
      const on = b.dataset.prio === p;
      b.className = 'prio-btn flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ' +
        (on ? styles[p] : 'bg-white/[0.02] text-slate-500 border-white/[0.08] hover:border-white/20');
    });
  }

  window.openTaskModal = function(id) {
    ensureModal();
    taskState.editingId = id || null;
    const t = id ? taskState.list.find(x => x.id === id) : null;

    $('taskModalTitle').textContent = id ? 'Edit Task' : 'New Task';
    $('taskTitle').value = t ? t.title : '';
    $('taskDesc').value  = t ? (t.description || '') : '';
    $('taskDue').value   = t ? (t.dueDate || '') : '';
    setPriority(t ? (t.priority || 'medium') : 'medium');
    $('taskSaveBtn').textContent = id ? 'Update Task' : 'Save Task';

    // Role field value
    const rf = $('taskRoleField');
    if (rf) rf.value = t ? (t.roleValue || '') : '';

    $('taskModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('taskTitle').focus(), 100);
  };

  window.closeTaskModal = function() {
    const m = $('taskModal'); if (m) m.classList.add('hidden');
    document.body.style.overflow = '';
    taskState.editingId = null;
  };

  window.saveTaskFromModal = function() {
    const title = $('taskTitle').value.trim();
    const desc  = $('taskDesc').value.trim();
    const due   = $('taskDue').value;
    const prio  = taskState.priority;
    const roleValue = ($('taskRoleField') ? $('taskRoleField').value.trim() : '');

    if (!title) { toast('Please enter a task title', 'error'); $('taskTitle').focus(); return; }

    if (taskState.editingId) {
      const t = taskState.list.find(x => x.id === taskState.editingId);
      if (t) {
        t.title = title;
        t.description = desc;
        t.dueDate = due;
        t.priority = prio;
        t.roleValue = roleValue;
      }
      toast('Task updated ✓', 'success');
    } else {
      taskState.list.unshift({
        id: uid(), title, description: desc, dueDate: due, priority: prio,
        roleValue,
        completed: false, createdAt: Date.now(), completedAt: null,
      });
      toast('Task added ✓', 'success');
    }
    saveTasks(); closeTaskModal(); refresh();
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

    loadTasks();
    refresh();

    const search = $('taskSearch');
    const sort = $('taskSort');
    search.addEventListener('input', e => { taskState.search = e.target.value; renderList(); });
    sort.addEventListener('change', e => { taskState.sort = e.target.value; renderList(); });
    document.addEventListener('click', e => { if (e.target.id === 'taskModal') closeTaskModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('taskModal') && !$('taskModal').classList.contains('hidden')) closeTaskModal(); });

    setPriority('medium');
    bindDropdowns();
    bindSecret();
    bindVault();
    bindAntiForensic();

    console.log('%c✅ TASKS READY (role:', 'color:#22d3ee;font-weight:bold', state.role + ')');
  });

})();