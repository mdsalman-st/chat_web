/* ============================================================================
   TASKS.JS — Real Backend Connected + Role-Adaptive
   ============================================================================ */

(function () {
  'use strict';

  const state = {
    role: 'student',
    user: {},
    tasks: [],
    filter: 'all',
    search: '',
    sort: 'date-asc',
    editingId: null,
    priority: 'medium',
  };

  const ROLE_TASK_FIELD = {
    student:    { label:'Subject',  type:'select', icon:'📚', options:['Physics','Math','Chemistry','Biology','Computer Science','English','Hindi','Social Studies','Other'] },
    employee:   { label:'Project',  type:'text',   icon:'💼', placeholder:'e.g. Q4 Report' },
    trader:     { label:'Symbol / Market', type:'text', icon:'📈', placeholder:'e.g. RELIANCE' },
    creator:    { label:'Platform', type:'select', icon:'🎨', options:['YouTube','Instagram','LinkedIn','Blog','Other'] },
    developer:  { label:'Project / Repo', type:'text', icon:'💻', placeholder:'e.g. nexus-core' },
    freelancer: { label:'Client',   type:'text',   icon:'🧑‍💻', placeholder:'e.g. Acme Inc' },
    teacher:    { label:'Class / Batch', type:'text', icon:'📚', placeholder:'e.g. Class 10-A' },
    doctor:     { label:'Patient / Ward', type:'text', icon:'🩺', placeholder:'e.g. Ravi Kumar' },
    other:      { label:'Category', type:'text',   icon:'✨', placeholder:'e.g. Personal' },
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function toast(msg, type='info') {
    if (typeof window.toast === 'function') return window.toast(msg, type);
    alert(msg);
  }

  /* ---------- Render Functions ---------- */
  function renderStats() {
    const el = $('taskStats'); if (!el) return;
    
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.completed).length;
    const pending = total - done;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = state.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;

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

  function renderList() {
    const el = $('taskList'); if (!el) return;
    
    let list = [...state.tasks];
    if (state.filter === 'active') list = list.filter(t => !t.completed);
    if (state.filter === 'done') list = list.filter(t => t.completed);
    
    const q = state.search.toLowerCase().trim();
    if (q) list = list.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description||'').toLowerCase().includes(q) ||
      (t.roleValue||'').toLowerCase().includes(q)
    );

    const rank = { high:0, medium:1, low:2 };
    list.sort((a,b) => (rank[a.priority]??3) - (rank[b.priority]??3));
    list.sort((a,b) => Number(a.completed) - Number(b.completed));

    if (list.length === 0) {
      el.innerHTML = `<div class="nx-card p-10 text-center">
        <div class="text-4xl mb-3">🎯</div>
        <h3 class="text-lg font-bold text-white mb-1">No tasks found</h3>
        <p class="text-sm text-slate-400">Create one to get started.</p>
      </div>`;
      return;
    }

    const roleCfg = ROLE_TASK_FIELD[state.role] || ROLE_TASK_FIELD.other;
    const todayStr = new Date().toISOString().split('T')[0];

    el.innerHTML = list.map(t => {
      const isOver = !t.completed && t.dueDate && t.dueDate < todayStr;
      const pl = t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
      
      return `<div class="task-row ${t.completed?'done':''}" data-id="${t._id}">
        <button class="task-checkbox" onclick="toggleTask('${t._id}')">✓</button>
        <div class="task-body" onclick="openTaskModal('${t._id}')" style="cursor:pointer">
          <div class="task-title">${esc(t.title)}</div>
          ${t.description?`<div class="text-xs text-slate-500 mb-2 truncate">${esc(t.description)}</div>`:''}
          <div class="task-meta flex flex-wrap gap-1">
            <span class="task-chip priority-${t.priority}">${pl}</span>
            ${t.roleValue ? `<span class="task-chip" style="background:rgba(139,92,246,0.12);color:#c4b5fd;border-color:rgba(139,92,246,0.25)">${roleCfg.icon} ${esc(t.roleValue)}</span>` : ''}
            ${t.dueDate ? `<span class="task-chip ${isOver?'overdue':''}">📅 ${t.dueDate}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn" onclick="event.stopPropagation(); openTaskModal('${t._id}')">✏️</button>
          <button class="task-action-btn danger" onclick="event.stopPropagation(); deleteTask('${t._id}')">🗑️</button>
        </div>
      </div>`;
    }).join('');
  }

  /* ---------- API Calls ---------- */
  async function loadTasks() {
    try {
      const res = await API.tasks.list(state.filter, state.search);
      state.tasks = res.tasks || [];
      renderStats();
      renderList();
    } catch (err) {
      console.error(err);
      toast('Failed to load tasks', 'error');
    }
  }

  window.toggleTask = async function(id) {
    try {
      const res = await API.tasks.toggle(id);
      const idx = state.tasks.findIndex(t => t._id === id);
      if (idx > -1) state.tasks[idx] = res.task;
      renderStats();
      renderList();
    } catch (err) {
      toast('Failed to toggle', 'error');
    }
  };

  window.deleteTask = async function(id) {
    if (!confirm('Delete this task?')) return;
    try {
      await API.tasks.remove(id);
      state.tasks = state.tasks.filter(t => t._id !== id);
      renderStats();
      renderList();
      toast('Task deleted', 'success');
    } catch (err) {
      toast('Failed to delete', 'error');
    }
  };

  window.setTaskFilter = function(f) {
    state.filter = f;
    document.querySelectorAll('.task-filter').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
    loadTasks();
  };

  /* ---------- Modal ---------- */
  function ensureModal() {
    if ($('taskModal')) return;
    const html = `
    <div id="taskModal" class="modal-overlay hidden" style="position:fixed;inset:0;z-index:200;background:rgba(5,7,13,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;">
      <div class="modal-box" style="width:100%;max-width:560px;background:#0f1424;border:1px solid rgba(255,255,255,0.1);border-radius:1.5rem;padding:1.5rem;">
        <h2 id="taskModalTitle" class="text-lg font-black text-white mb-4">New Task</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Title *</label>
            <input type="text" id="taskTitle" class="w-full px-4 py-2 rounded-xl bg-ink-950/60 border border-white/10 text-white focus:border-cyan-400">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Priority</label>
              <select id="taskPriority" class="w-full px-4 py-2 rounded-xl bg-ink-950/60 border border-white/10 text-white">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Due Date</label>
              <input type="date" id="taskDue" class="w-full px-4 py-2 rounded-xl bg-ink-950/60 border border-white/10 text-white">
            </div>
          </div>
          <div id="roleFieldWrap">
            <label id="roleFieldLabel" class="block text-[10px] font-bold text-slate-400 mb-1">Field</label>
            <div id="roleFieldInput"></div>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button onclick="closeTaskModal()" class="px-4 py-2 rounded-xl bg-white/5 text-slate-300">Cancel</button>
          <button onclick="saveTask()" class="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold">Save</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function buildRoleField() {
    const cfg = ROLE_TASK_FIELD[state.role] || ROLE_TASK_FIELD.other;
    $('roleFieldLabel').textContent = cfg.label;
    
    if (cfg.type === 'select') {
      const opts = cfg.options.map(o => `<option value="${o}">${o}</option>`).join('');
      $('roleFieldInput').innerHTML = `<select id="taskRoleField" class="w-full px-4 py-2 rounded-xl bg-ink-950/60 border border-white/10 text-white"><option value="">— Select —</option>${opts}</select>`;
    } else {
      $('roleFieldInput').innerHTML = `<input type="text" id="taskRoleField" placeholder="${cfg.placeholder}" class="w-full px-4 py-2 rounded-xl bg-ink-950/60 border border-white/10 text-white">`;
    }
  }

  window.openTaskModal = function(id) {
    ensureModal();
    state.editingId = id || null;
    const t = id ? state.tasks.find(x => x._id === id) : null;
    
    $('taskModalTitle').textContent = id ? 'Edit Task' : 'New Task';
    $('taskTitle').value = t ? t.title : '';
    $('taskDue').value = t ? (t.dueDate||'') : '';
    $('taskPriority').value = t ? (t.priority||'medium') : 'medium';
    
    buildRoleField();
    if ($('taskRoleField')) $('taskRoleField').value = t ? (t.roleValue||'') : '';

    $('taskModal').classList.remove('hidden');
    $('taskTitle').focus();
  };

  window.closeTaskModal = function() {
    if ($('taskModal')) $('taskModal').classList.add('hidden');
    state.editingId = null;
  };

  window.saveTask = async function() {
    const title = $('taskTitle').value.trim();
    if (!title) return toast('Title required', 'error');

    const payload = {
      title,
      priority: $('taskPriority').value,
      dueDate: $('taskDue').value,
      roleValue: $('taskRoleField') ? $('taskRoleField').value : ''
    };

    try {
      if (state.editingId) {
        await API.tasks.update(state.editingId, payload);
        toast('Task updated', 'success');
      } else {
        await API.tasks.create(payload);
        toast('Task created', 'success');
      }
      closeTaskModal();
      loadTasks();
    } catch (err) {
      toast('Save failed', 'error');
    }
  };

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    if (!API.Token.exists()) return window.location.href = 'auth.html';

    try {
      const res = await API.auth.me();
      state.user = res.user || {};
      state.role = state.user.role || 'student';
    } catch(e) {}

    const name = (state.user.name || 'User').split(' ')[0];
    if ($('avatarLetter')) $('avatarLetter').textContent = name.charAt(0).toUpperCase();
    if ($('profileName')) $('profileName').textContent = name;
    if ($('panelName')) $('panelName').textContent = state.user.name || 'User';
    if ($('panelEmail')) $('panelEmail').textContent = state.user.email || '';
    if ($('sideRoleTag')) $('sideRoleTag').textContent = state.role;

    // Search & Filter listeners
    const searchInp = $('taskSearch');
    if (searchInp) {
      let timeout;
      searchInp.addEventListener('input', e => {
        state.search = e.target.value;
        clearTimeout(timeout);
        timeout = setTimeout(loadTasks, 400);
      });
    }

    $('taskSort')?.addEventListener('change', e => { state.sort = e.target.value; renderList(); });
    $('vaultExitBtn')?.addEventListener('click', () => $('chatVault').classList.add('vault-hidden'));

    // Initial Load
    loadTasks();
  });

})();