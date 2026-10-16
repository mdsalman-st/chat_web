/* ============================================================================
   ANALYTICS.JS — Real Data Insights
   ============================================================================ */

(function () {
  'use strict';

  const KEYS = {
    ROLE:'nexus_user_role', USER:'nexus_user', USERNAME:'nexus_username', SECRET:'nexus_secret_code',
  };

  const state = {
    role:'student', user:{}, username:'', secret:'',
    vaultOpen:false, seeded:false, range: 7,
  };

  const $ = id => document.getElementById(id);

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

  /* ---------- Data Loaders ---------- */
  function storageKey(prefix) {
    const u = state.username || state.user.email || 'default';
    return prefix + '_' + u;
  }

  function loadTasks() {
    try { return JSON.parse(localStorage.getItem(storageKey('nexus_tasks')) || '[]'); }
    catch(e){ return []; }
  }
  function loadNotes() {
    try { return JSON.parse(localStorage.getItem(storageKey('nexus_notes')) || '[]'); }
    catch(e){ return []; }
  }

  /* ---------- Helpers ---------- */
  const todayISO = () => new Date().toISOString().split('T')[0];
  const isOverdue = t => !t.completed && t.dueDate && t.dueDate < todayISO();

  function dayLabel(d) {
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  }

  /* ---------- Compute Analytics ---------- */
  function computeAnalytics() {
    const tasks = loadTasks();
    const notes = loadNotes();

    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const pending = total - done;
    const overdue = tasks.filter(isOverdue).length;
    const completion = total ? Math.round((done / total) * 100) : 0;

    // Priority counts
    const priority = { high: 0, medium: 0, low: 0 };
    tasks.forEach(t => { if (priority[t.priority] !== undefined) priority[t.priority]++; });

    // Notes analytics
    const notesTotal = notes.length;
    const notesPinned = notes.filter(n => n.pinned).length;
    const notesWeek = notes.filter(n => Date.now() - n.createdAt < 7 * 86400000).length;

    // Notes by color
    const colorCounts = {};
    notes.forEach(n => { colorCounts[n.color] = (colorCounts[n.color] || 0) + 1; });

    // Weekly data (completed tasks per day)
    const days = [];
    for (let i = state.range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayEnd = d.getTime() + 86400000;

      const completedCount = tasks.filter(t =>
        t.completed && t.completedAt && t.completedAt >= d.getTime() && t.completedAt < dayEnd
      ).length;

      const createdCount = tasks.filter(t =>
        t.createdAt >= d.getTime() && t.createdAt < dayEnd
      ).length;

      days.push({
        label: dayLabel(d),
        date: d,
        completed: completedCount,
        created: createdCount,
      });
    }

    // Productivity score = weighted formula
    const activity = days.reduce((s, d) => s + d.completed, 0);
    const productivityScore = Math.min(100, Math.round(
      (completion * 0.5) + (Math.min(activity, 20) * 2.5)
    ));

    return {
      tasks: { total, done, pending, overdue, completion, priority },
      notes: { total: notesTotal, pinned: notesPinned, week: notesWeek, colors: colorCounts },
      days,
      productivityScore,
      weeklyTotal: days.reduce((s, d) => s + d.completed, 0),
    };
  }

  /* ---------- Top Stats ---------- */
  function renderTopStats(a) {
    const stats = [
      { label:'Total Tasks',  value: a.tasks.total,     icon:'📋', color:'cyan' },
      { label:'Completed',    value: a.tasks.done,      icon:'✅', color:'green' },
      { label:'Pending',      value: a.tasks.pending,   icon:'⏳', color:'amber' },
      { label:'Notes',        value: a.notes.total,     icon:'📝', color:'violet' },
    ];

    const C = {
      cyan:{ bg:'from-cyan-500/15 to-cyan-500/[0.03]', text:'text-cyan-300', border:'border-cyan-500/20' },
      green:{ bg:'from-emerald-500/15 to-emerald-500/[0.03]', text:'text-emerald-300', border:'border-emerald-500/20' },
      amber:{ bg:'from-amber-500/15 to-amber-500/[0.03]', text:'text-amber-300', border:'border-amber-500/20' },
      violet:{ bg:'from-violet-500/15 to-violet-500/[0.03]', text:'text-violet-300', border:'border-violet-500/20' },
    };

    $('topStats').innerHTML = stats.map(s => {
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

  /* ---------- Weekly Bar Chart (SVG) ---------- */
  function renderWeeklyChart(a) {
    const el = $('weeklyChart');
    const days = a.days;
    const max = Math.max(...days.map(d => d.completed), 5);

    $('weeklyTotal').textContent = a.weeklyTotal;

    const w = 100;
    const h = 100;
    const padding = 8;
    const cols = days.length;
    const colWidth = (w - padding * 2) / cols;
    const barWidth = colWidth * 0.55;

    // Y-axis guides
    let gridLines = '';
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * (h - padding * 2) / 4);
      gridLines += `<line x1="${padding}" y1="${y}" x2="${w - padding}" y2="${y}"
        stroke="rgba(255,255,255,0.05)" stroke-width="0.3" stroke-dasharray="1,1"/>`;
    }

    let bars = '';
    days.forEach((d, i) => {
      const x = padding + i * colWidth + (colWidth - barWidth) / 2;
      const barH = max ? (d.completed / max) * (h - padding * 2 - 8) : 0;
      const y = h - padding - barH;

      // Background "track"
      bars += `<rect x="${x}" y="${padding}" width="${barWidth}" height="${h - padding * 2}"
        fill="rgba(255,255,255,0.02)" rx="2"/>`;

      // Bar (only if > 0)
      if (d.completed > 0) {
        bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}"
          fill="url(#barGrad)" rx="2" class="bar-anim"
          style="transform-origin: ${x + barWidth / 2}px ${h - padding}px; animation-delay: ${i * 60}ms"/>`;
      }

      // Label
      bars += `<text x="${x + barWidth / 2}" y="${h - 2}" text-anchor="middle"
        fill="#64748b" font-size="3.5" font-weight="600" font-family="Inter">${d.label}</text>`;

      // Value on top
      if (d.completed > 0) {
        bars += `<text x="${x + barWidth / 2}" y="${y - 1.5}" text-anchor="middle"
          fill="#67e8f9" font-size="3.2" font-weight="700" font-family="Inter">${d.completed}</text>`;
      }
    });

    el.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="w-full h-full">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#22d3ee"/>
            <stop offset="100%" stop-color="#3b82f6"/>
          </linearGradient>
        </defs>
        ${gridLines}
        ${bars}
      </svg>`;
  }

  /* ---------- Priority Donut (SVG) ---------- */
  function renderPriorityChart(a) {
    const el = $('priorityChart');
    const p = a.tasks.priority;
    const total = p.high + p.medium + p.low;

    if (total === 0) {
      el.innerHTML = `<div class="empty-chart">
        <div class="empty-chart-icon">📊</div>
        <p class="text-xs">No tasks yet</p>
        <a href="tasks.html" class="text-[11px] text-cyan-400 hover:text-cyan-300 mt-2">Add your first task →</a>
      </div>`;
      return;
    }

    const size = 44;
    const radius = 16;
    const cx = size / 2, cy = size / 2;
    const circumference = 2 * Math.PI * radius;

    const data = [
      { label:'High',   value:p.high,   color:'#ef4444' },
      { label:'Medium', value:p.medium, color:'#f59e0b' },
      { label:'Low',    value:p.low,    color:'#22c55e' },
    ].filter(d => d.value > 0);

    let offset = 0;
    let segments = '';
    data.forEach(d => {
      const len = (d.value / total) * circumference;
      segments += `<circle cx="${cx}" cy="${cy}" r="${radius}"
        fill="none" stroke="${d.color}" stroke-width="6"
        stroke-dasharray="${len} ${circumference - len}"
        stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})"
        stroke-linecap="round"/>`;
      offset += len;
    });

    const legend = data.map(d => `
      <div class="flex items-center gap-2">
        <span class="legend-dot" style="background:${d.color}"></span>
        <span class="text-xs text-slate-300">${d.label}</span>
        <span class="text-xs font-bold text-white ml-auto">${d.value}</span>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="relative mb-4">
        <svg viewBox="0 0 ${size} ${size}" class="w-32 h-32 mx-auto">
          <circle cx="${cx}" cy="${cy}" r="${radius}"
            fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="6"/>
          ${segments}
          <text x="${cx}" y="${cy - 1}" text-anchor="middle"
            fill="#ffffff" font-size="7" font-weight="900" font-family="Inter">${total}</text>
          <text x="${cx}" y="${cy + 4}" text-anchor="middle"
            fill="#64748b" font-size="2.5" font-weight="700" font-family="Inter" letter-spacing="0.5">TASKS</text>
        </svg>
      </div>
      <div class="space-y-2 w-full">${legend}</div>
    `;
  }

  /* ---------- Completion Ring ---------- */
  function renderCompletionRing(a) {
    const el = $('completionRing');
    const pct = a.tasks.completion;

    const size = 44;
    const radius = 16;
    const cx = size / 2, cy = size / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    el.innerHTML = `
      <div class="relative">
        <svg viewBox="0 0 ${size} ${size}" class="w-32 h-32">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#22d3ee"/>
              <stop offset="100%" stop-color="#3b82f6"/>
            </linearGradient>
          </defs>
          <circle cx="${cx}" cy="${cy}" r="${radius}"
            fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="5"/>
          <circle cx="${cx}" cy="${cy}" r="${radius}"
            fill="none" stroke="url(#ringGrad)" stroke-width="5"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
            stroke-linecap="round"
            transform="rotate(-90 ${cx} ${cy})"
            class="ring-progress"
            style="--ring-offset: ${offset}"/>
          <text x="${cx}" y="${cy - 1}" text-anchor="middle"
            fill="#ffffff" font-size="8" font-weight="900" font-family="Inter">${pct}%</text>
          <text x="${cx}" y="${cy + 4}" text-anchor="middle"
            fill="#64748b" font-size="2.3" font-weight="700" font-family="Inter" letter-spacing="0.5">DONE</text>
        </svg>
      </div>
      <div class="grid grid-cols-3 gap-3 w-full mt-4 text-center">
        <div>
          <p class="text-sm font-black text-white">${a.tasks.done}</p>
          <p class="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Done</p>
        </div>
        <div class="border-x border-white/[0.06]">
          <p class="text-sm font-black text-white">${a.tasks.pending}</p>
          <p class="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Pending</p>
        </div>
        <div>
          <p class="text-sm font-black ${a.tasks.overdue > 0 ? 'text-red-400' : 'text-white'}">${a.tasks.overdue}</p>
          <p class="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Overdue</p>
        </div>
      </div>
    `;

    // Trigger ring animation
    setTimeout(() => {
      const ring = el.querySelector('.ring-progress');
      if (ring) ring.style.strokeDashoffset = offset;
    }, 60);
  }

  /* ---------- Notes Analytics ---------- */
  function renderNotesAnalytics(a) {
    const n = a.notes;
    const items = [
      { label:'Total Notes', value:n.total, icon:'📝', color:'text-cyan-300' },
      { label:'Pinned',      value:n.pinned, icon:'📌', color:'text-amber-300' },
      { label:'This Week',   value:n.week, icon:'✨', color:'text-emerald-300' },
    ];

    $('notesAnalytics').innerHTML = items.map(i => `
      <div class="stat-mini">
        <div class="text-lg">${i.icon}</div>
        <div class="flex-1">
          <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">${i.label}</p>
          <p class="text-base font-black text-white leading-tight mt-0.5">${i.value}</p>
        </div>
      </div>
    `).join('');
  }

  /* ---------- Productivity Score ---------- */
  function renderProductivity(a) {
    const el = $('productivityScore');
    const score = a.productivityScore;

    let label, color, emoji;
    if (score >= 80)      { label = 'Excellent'; color = '#22c55e'; emoji = '🚀'; }
    else if (score >= 60) { label = 'Great';     color = '#22d3ee'; emoji = '⚡'; }
    else if (score >= 40) { label = 'Good';      color = '#3b82f6'; emoji = '👍'; }
    else if (score >= 20) { label = 'Fair';      color = '#f59e0b'; emoji = '🌱'; }
    else                  { label = 'Starting';  color = '#94a3b8'; emoji = '🌙'; }

    const size = 44;
    const radius = 16;
    const cx = size / 2, cy = size / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    el.innerHTML = `
      <div class="relative mb-4">
        <svg viewBox="0 0 ${size} ${size}" class="w-32 h-32">
          <circle cx="${cx}" cy="${cy}" r="${radius}"
            fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="5"/>
          <circle cx="${cx}" cy="${cy}" r="${radius}"
            fill="none" stroke="${color}" stroke-width="5"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
            stroke-linecap="round"
            transform="rotate(-90 ${cx} ${cy})"
            class="ring-progress"
            style="--ring-offset: ${offset}"/>
          <text x="${cx}" y="${cy + 1}" text-anchor="middle"
            fill="#ffffff" font-size="9" font-weight="900" font-family="Inter">${score}</text>
        </svg>
      </div>
      <p class="text-sm font-bold" style="color:${color}">${emoji} ${label}</p>
      <p class="text-[11px] text-slate-500 mt-1 text-center max-w-[180px]">Based on completion rate & recent activity</p>
    `;

    setTimeout(() => {
      const ring = el.querySelector('.ring-progress');
      if (ring) ring.style.strokeDashoffset = offset;
    }, 100);
  }

  /* ---------- Notes Color Distribution ---------- */
  function renderColorDistribution(a) {
    const el = $('colorDistribution');
    const colors = a.notes.colors;
    const total = Object.values(colors).reduce((s, v) => s + v, 0);

    if (total === 0) {
      el.innerHTML = `<div class="empty-chart">
        <div class="empty-chart-icon">🎨</div>
        <p class="text-xs">No notes yet</p>
        <a href="notes.html" class="text-[11px] text-cyan-400 hover:text-cyan-300 mt-2">Write your first note →</a>
      </div>`;
      return;
    }

    const map = {
      yellow: '#f59e0b', blue: '#3b82f6', green: '#22c55e',
      pink: '#ec4899', purple: '#8b5cf6', gray: '#94a3b8',
    };

    const sorted = Object.entries(colors).sort((a, b) => b[1] - a[1]);

    el.innerHTML = sorted.map(([color, count]) => {
      const pct = Math.round((count / total) * 100);
      return `<div class="mb-3">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="legend-dot" style="background:${map[color] || '#64748b'}"></span>
            <span class="text-xs text-slate-300 capitalize">${color}</span>
          </div>
          <span class="text-xs font-bold text-white">${count} <span class="text-slate-500 font-normal">(${pct}%)</span></span>
        </div>
        <div class="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
          <div class="h-full rounded-full transition-all duration-700"
            style="width:${pct}%;background:${map[color] || '#64748b'}"></div>
        </div>
      </div>`;
    }).join('');
  }

  /* ---------- Insights ---------- */
  function renderInsights(a) {
    const el = $('insightsList');
    const insights = [];

    // Completion
    if (a.tasks.total > 0) {
      if (a.tasks.completion >= 75) insights.push({ icon:'🚀', text:`You've completed ${a.tasks.completion}% of your tasks — outstanding!`, color:'emerald' });
      else if (a.tasks.completion >= 50) insights.push({ icon:'⚡', text:`${a.tasks.completion}% completion — you're on track.`, color:'cyan' });
      else if (a.tasks.completion >= 25) insights.push({ icon:'👍', text:`${a.tasks.completion}% completion — keep going!`, color:'blue' });
      else insights.push({ icon:'🌱', text:`Only ${a.tasks.completion}% completed — try finishing a few today.`, color:'amber' });
    }

    // Overdue
    if (a.tasks.overdue > 0) {
      insights.push({ icon:'⚠️', text:`${a.tasks.overdue} task${a.tasks.overdue > 1 ? 's' : ''} overdue. Address them soon.`, color:'red' });
    } else if (a.tasks.total > 0) {
      insights.push({ icon:'✅', text:'No overdue tasks — you\'re all caught up!', color:'emerald' });
    }

    // High priority
    if (a.tasks.priority.high > 0) {
      insights.push({ icon:'🔥', text:`${a.tasks.priority.high} high-priority task${a.tasks.priority.high > 1 ? 's' : ''} need attention.`, color:'amber' });
    }

    // Notes
    if (a.notes.total > 0) {
      if (a.notes.pinned > 0) insights.push({ icon:'📌', text:`${a.notes.pinned} note${a.notes.pinned > 1 ? 's' : ''} pinned for quick access.`, color:'violet' });
      if (a.notes.week > 3) insights.push({ icon:'✨', text:`${a.notes.week} notes this week — you're on a roll!`, color:'cyan' });
    }

    // Weekly activity
    if (a.weeklyTotal > 0) {
      insights.push({ icon:'📊', text:`${a.weeklyTotal} tasks completed in the last ${state.range} days.`, color:'blue' });
    }

    // Empty state
    if (insights.length === 0) {
      insights.push({ icon:'👋', text:'Start by adding tasks and notes to see insights.', color:'gray' });
    }

    const colors = {
      emerald:'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
      cyan:'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
      blue:'bg-blue-500/10 border-blue-500/20 text-blue-300',
      amber:'bg-amber-500/10 border-amber-500/20 text-amber-300',
      red:'bg-red-500/10 border-red-500/20 text-red-300',
      violet:'bg-violet-500/10 border-violet-500/20 text-violet-300',
      gray:'bg-white/5 border-white/10 text-slate-300',
    };

    el.innerHTML = insights.map(i => `
      <div class="flex items-start gap-3 p-3 rounded-xl border ${colors[i.color]}">
        <span class="text-base leading-none">${i.icon}</span>
        <p class="text-xs leading-relaxed flex-1">${i.text}</p>
      </div>
    `).join('');
  }

  /* ---------- Range ---------- */
  window.setRange = function (r) {
    state.range = r;
    document.querySelectorAll('.range-btn').forEach(b =>
      b.classList.toggle('active', Number(b.dataset.range) === r)
    );
    refresh();
  };

  /* ---------- Refresh All ---------- */
  function refresh() {
    const a = computeAnalytics();
    renderTopStats(a);
    renderWeeklyChart(a);
    renderPriorityChart(a);
    renderCompletionRing(a);
    renderNotesAnalytics(a);
    renderProductivity(a);
    renderColorDistribution(a);
    renderInsights(a);
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

    refresh();
    bindDropdowns();
    bindSecret();
    bindVault();
    bindAntiForensic();

    console.log('%c✅ ANALYTICS READY', 'color:#22d3ee;font-weight:bold');
  });

})();