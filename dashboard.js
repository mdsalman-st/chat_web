/* ============================================================================
   DASHBOARD.JS — Real User Data + Role-Adaptive Widgets
   ============================================================================ */

(function () {
  'use strict';

  const state = {
    role: 'student',
    user: {},
    username: '',
    secret: '',
    vaultOpen: false,
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- Toast ---------- */
  function toast(msg, type='info') {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position:'fixed', bottom:'24px', left:'50%',
      transform:'translateX(-50%) translateY(20px)',
      background: type==='error'?'#dc2626':type==='success'?'#059669':'#111827',
      color:'#fff', padding:'0.75rem 1.25rem', borderRadius:'12px',
      fontSize:'0.85rem', fontWeight:'600', zIndex:'9999',
      opacity:'0', transition:'opacity 0.3s, transform 0.3s',
      pointerEvents:'none', maxWidth:'90vw', textAlign:'center',
    });
    document.body.appendChild(t);
    requestAnimationFrame(()=>{ t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
    setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(20px)'; setTimeout(()=>t.remove(),350); }, 2400);
  }
  window.toast = toast;

  /* ---------- Role Config (No Fake Data) ---------- */
  const ROLE_CONFIG = {
    student:    { icon:'🎓', greeting:"Let's get some studying done." },
    employee:   { icon:'💼', greeting:"Ready to crush the workday?" },
    trader:     { icon:'📈', greeting:"Markets are moving. Ready?" },
    creator:    { icon:'🎨', greeting:"Time to create something amazing." },
    developer:  { icon:'💻', greeting:"Ship something great today." },
    freelancer: { icon:'🧑‍💻', greeting:"Let's land some clients." },
    teacher:    { icon:'📚', greeting:"Your students await." },
    doctor:     { icon:'🩺', greeting:"Ready for today's patients?" },
    other:      { icon:'✨', greeting:"Let's build your custom workspace." },
  };

  /* ---------- Helpers ---------- */
  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Working late';
  }

  /* ---------- Render Welcome ---------- */
  function renderWelcome() {
    const cfg = ROLE_CONFIG[state.role] || ROLE_CONFIG.student;
    const name = (state.user.name || state.username || 'User').split(' ')[0];

    const wTime = $('welcomeTime');
    const wName = $('welcomeName');
    const wMsg = $('welcomeMsg');
    if (wTime) wTime.textContent = greeting();
    if (wName) wName.textContent = name;
    if (wMsg) wMsg.textContent = cfg.greeting;

    const avatarL = $('avatarLetter');
    if (avatarL) avatarL.textContent = name.charAt(0).toUpperCase();

    const profileName = $('profileName');
    if (profileName) profileName.textContent = name;

    const panelName = $('panelName');
    if (panelName) panelName.textContent = state.user.name || 'User';

    const panelEmail = $('panelEmail');
    if (panelEmail) panelEmail.textContent = state.user.email || 'user@example.com';

    const sideRoleTag = $('sideRoleTag');
    if (sideRoleTag) sideRoleTag.textContent = `${cfg.icon} ${state.role}`;
  }

  /* ---------- Render Stats (Real Data Loading State) ---------- */
  function renderStats() {
    const row = $('statRow');
    if (!row) return;
    row.innerHTML = ['Total Tasks', 'Completed', 'Pending Tasks', 'My Notes'].map((label, i) => `
      <div class="nx-card p-4 anim anim-${Math.min(i+1,5)}">
        <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">${esc(label)}</p>
        <p class="text-2xl font-black text-white leading-none">0</p>
      </div>
    `).join('');
  }

  /* ---------- Render Main Widget (Real Tasks) ---------- */
  function renderMain(tasks = []) {
    const el = $('mainWidget');
    if (!el) return;
    const listHtml = tasks.length === 0
      ? '<li class="p-3 text-center text-xs text-slate-500">No tasks yet. Create one in Tasks!</li>'
      : tasks.slice(0, 4).map(t => `
          <li onclick="window.location.href='tasks.html'" class="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-cyan-500/20 transition-all cursor-pointer">
            <span class="text-lg leading-none">${t.completed ? '✅' : '⏳'}</span>
            <span class="flex-1 text-sm font-medium text-slate-200 truncate">${esc(t.title || 'Untitled Task')}</span>
            <span class="text-xs text-slate-500 whitespace-nowrap">${esc(t.dueDate || 'No date')}</span>
          </li>
        `).join('');
    el.innerHTML = `
      <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-1 h-4 rounded bg-gradient-to-b from-cyan-400 to-blue-500"></span>
        Recent Tasks
      </h3>
      <ul class="space-y-2">${listHtml}</ul>`;
  }

  /* ---------- Render Secondary (Real Notes) ---------- */
  function renderSecondary(notes = []) {
    const el = $('secondaryWidget');
    if (!el) return;
    const listHtml = notes.length === 0
      ? '<li class="p-3 text-center text-xs text-slate-500">No notes yet. Add one in Notes!</li>'
      : notes.slice(0, 4).map(n => `
          <li onclick="window.location.href='notes.html'" class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all cursor-pointer">
            <span class="flex-1 text-sm text-slate-200 truncate">${esc(n.title || 'Untitled Note')}</span>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">${esc(n.roleTag || 'Note')}</span>
          </li>
        `).join('');
    el.innerHTML = `
      <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-1 h-4 rounded bg-gradient-to-b from-cyan-400 to-blue-500"></span>
        Recent Notes
      </h3>
      <ul class="space-y-2">${listHtml}</ul>`;
  }

  /* ---------- Render Side (Real Summary) ---------- */
  function renderSide(summaryText = 'Your workspace is synced with live data.') {
    const el = $('sideWidget');
    if (!el) return;
    el.innerHTML = `
      <h3 class="text-base font-bold text-white mb-3 flex items-center gap-2">
        <span class="w-1 h-4 rounded bg-gradient-to-b from-cyan-400 to-blue-500"></span>
        Workspace Status
      </h3>
      <p class="text-sm text-slate-300 leading-relaxed">${esc(summaryText)}</p>`;
  }

  /* ---------- Sidebar / Dropdowns ---------- */
  window.toggleSidebar = function() {
    const s = $('sidebar'), b = $('sidebarBackdrop');
    if (s) s.classList.toggle('open');
    if (b) b.classList.toggle('hidden');
  };

  window.handleLogout = function() {
    if (!confirm('Sign out?')) return;
    API.auth.logout();
    try {
      localStorage.removeItem('nexus_user_role');
      localStorage.removeItem('nexus_username');
      localStorage.removeItem('nexus_secret_code');
    } catch (e) {}
    if (window.SocketClient) window.SocketClient.disconnect();
    window.location.href = 'index.html';
  };

  function bindDropdowns() {
    const nB = $('notifBtn'), nP = $('notifPanel');
    const pB = $('profileBtn'), pP = $('profilePanel');
    if (!nB || !pB) return;
    const close = () => { nP?.classList.add('hidden'); pP?.classList.add('hidden'); };
    nB.addEventListener('click', e => { e.stopPropagation(); pP?.classList.add('hidden'); nP?.classList.toggle('hidden'); });
    pB.addEventListener('click', e => { e.stopPropagation(); nP?.classList.add('hidden'); pP?.classList.toggle('hidden'); });
    document.addEventListener('click', close);
    [nP, pP].forEach(p => p && p.addEventListener('click', e => e.stopPropagation()));
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    // Auth guard
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    // Fetch fresh user data
    try {
      const res = await API.auth.me();
      state.user = res.user || {};
      state.role = state.user.role || localStorage.getItem('nexus_user_role') || 'student';
      state.username = state.user.username || '';
      state.secret = (localStorage.getItem('nexus_secret_code') || '').toLowerCase();

      // Cache
      try {
        localStorage.setItem('nexus_user_role', state.role);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load user:', err);
      API.Token.remove();
      window.location.href = 'auth.html';
      return;
    }

    // Render initial empty/loading UI (no fake data)
    renderWelcome();
    renderStats();
    renderMain([]);
    renderSecondary([]);
    renderSide();
    bindDropdowns();

    // 🔥 Fetch REAL stats, tasks & notes and update
    try {
      const [taskStats, noteStats, taskListRes, noteListRes] = await Promise.all([
        API.tasks.stats(),
        API.notes.stats(),
        API.tasks.list().catch(() => ({ tasks: [] })),
        API.notes.list().catch(() => ({ notes: [] }))
      ]);

      const t = taskStats.stats;
      const n = noteStats.stats;
      renderMain(taskListRes.tasks || []);
      renderSecondary(noteListRes.notes || []);
      renderSide(`You have ${t.pending || 0} pending task(s) and ${n.total || 0} saved note(s).`);

      // Update the statRow manually with REAL data
      const row = $('statRow');
      if (row) {
        row.innerHTML = `
          <div class="nx-card p-4 bg-gradient-to-br from-cyan-500/15 to-cyan-500/[0.03] border border-cyan-500/20">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300">Total Tasks</p>
              <span class="text-base">📋</span>
            </div>
            <p class="text-2xl font-black text-white leading-none">${t.total}</p>
          </div>
          <div class="nx-card p-4 bg-gradient-to-br from-emerald-500/15 to-emerald-500/[0.03] border border-emerald-500/20">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300">Completed</p>
              <span class="text-base">✅</span>
            </div>
            <p class="text-2xl font-black text-white leading-none">${t.done}</p>
          </div>
          <div class="nx-card p-4 bg-gradient-to-br from-amber-500/15 to-amber-500/[0.03] border border-amber-500/20">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-300">Pending Tasks</p>
              <span class="text-base">⏳</span>
            </div>
            <p class="text-2xl font-black text-white leading-none">${t.pending}</p>
          </div>
          <div class="nx-card p-4 bg-gradient-to-br from-violet-500/15 to-violet-500/[0.03] border border-violet-500/20">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-300">My Notes</p>
              <span class="text-base">📝</span>
            </div>
            <p class="text-2xl font-black text-white leading-none">${n.total}</p>
          </div>
        `;
      }
    } catch (err) {
      console.error('Failed to load real stats:', err);
    }

    console.log('%c⚡ MAJID DASHBOARD READY', 'color:#22d3ee;font-weight:bold');
    console.log('User:', state.user.name, '| Role:', state.role);
  });

})();