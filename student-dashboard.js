/**
 * Nexus — Student Dashboard logic
 */
(function () {
  'use strict';

  // =========================================
  // 1. DASHBOARD STATS (LIVE DATA)
  // =========================================
  async function loadDashboardStats() {
    const statRow = document.getElementById('statRow');
    if (!statRow || !window.API?.tests) return;

    statRow.innerHTML = `
      <div class="p-4 rounded-xl glass-inner flex flex-col justify-center animate-pulse"><div class="h-4 bg-white/10 rounded w-1/2 mb-2"></div><div class="h-8 bg-white/10 rounded w-3/4"></div></div>
      <div class="p-4 rounded-xl glass-inner flex flex-col justify-center animate-pulse"><div class="h-4 bg-white/10 rounded w-1/2 mb-2"></div><div class="h-8 bg-white/10 rounded w-3/4"></div></div>
      <div class="p-4 rounded-xl glass-inner flex flex-col justify-center animate-pulse"><div class="h-4 bg-white/10 rounded w-1/2 mb-2"></div><div class="h-8 bg-white/10 rounded w-3/4"></div></div>
      <div class="p-4 rounded-xl glass-inner flex flex-col justify-center animate-pulse"><div class="h-4 bg-white/10 rounded w-1/2 mb-2"></div><div class="h-8 bg-white/10 rounded w-3/4"></div></div>
    `;

    try {
      const res = await window.API.tests.getRecentResults(50);
      const results = res.results || [];

      let totalTests = results.length;
      let totalScorePct = 0;
      let bestScore = 0;
      let totalQuestionsSolved = 0;

      results.forEach(r => {
        // 👇 NAYA: Combined Score ko priority do, agar nahi hai toh MCQ score use karo
        const pct = r.combinedScore?.percentage ?? r.score?.percentage ?? 0;
        
        totalScorePct += pct;
        if (pct > bestScore) bestScore = pct;
        totalQuestionsSolved += (r.totalQuestions || 0);
      });

      const avgScore = totalTests > 0 ? Math.round(totalScorePct / totalTests) : 0;

      statRow.innerHTML = `
        <div class="p-4 rounded-xl glass-inner flex flex-col justify-center">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--text-muted);">Tests Taken</p>
          <h3 class="text-2xl font-black" style="color: var(--text-main);">${totalTests}</h3>
        </div>
        <div class="p-4 rounded-xl glass-inner flex flex-col justify-center">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--text-muted);">Avg. Score</p>
          <h3 class="text-2xl font-black text-cyan-400">${avgScore}%</h3>
        </div>
        <div class="p-4 rounded-xl glass-inner flex flex-col justify-center">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--text-muted);">Best Score</p>
          <h3 class="text-2xl font-black text-emerald-400">${bestScore}%</h3>
        </div>
        <div class="p-4 rounded-xl glass-inner flex flex-col justify-center">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--text-muted);">Qs Solved</p>
          <h3 class="text-2xl font-black text-violet-400">${totalQuestionsSolved}</h3>
        </div>
      `;
    } catch (e) {
      console.warn('Could not load dashboard stats:', e);
      statRow.innerHTML = '<div class="col-span-full text-center text-xs text-red-400">Failed to load stats.</div>';
    }
  }

  // =========================================
  // 2. ACADEMIC PROFILE & ENROLLED SUBJECTS
  // =========================================
  async function loadStudentAcademicData() {
    const badgeEl = document.getElementById('dashAcademicBadge');
    const gridEl = document.getElementById('dashSubjectGrid');
    if (!window.API || !window.API.tests) return;

    try {
      const res = await window.API.tests.getProfile();
      const profile = res.profile || {};

      if (badgeEl && profile.formattedBadge) {
        badgeEl.textContent = profile.formattedBadge;
      }

      // Render study plan based on enrolled subjects
      loadStudyPlan(profile);

      if (gridEl) {
        const subjects = profile.selectedSubjects || [];

        if (subjects.length === 0) {
          gridEl.innerHTML = `
            <div class="col-span-full p-4 rounded-xl glass-inner text-center">
              <p class="text-xs font-semibold mb-1" style="color: var(--text-main);">Set up your curriculum subjects</p>
              <p class="text-[11px] mb-3" style="color: var(--text-muted);">Choose your board and subjects to unlock chapter-wise mock tests.</p>
              <a href="settings.html" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition">Configure Subjects in Settings</a>
            </div>
          `;
          return;
        }

        gridEl.innerHTML = subjects.map((sub) => {
          const isLive = true;
          return `
            <div onclick="window.location.href='test-select.html?subject=${encodeURIComponent(sub.code)}'"
                 class="p-3.5 rounded-xl glass-inner hover:border-cyan-500/40 transition cursor-pointer flex flex-col justify-between group">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl">${sub.icon || '📚'}</span>
                  <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isLive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-slate-500/15 text-slate-400 border border-slate-500/25'}">${isLive ? 'Live' : 'Coming soon'}</span>
                </div>
                <h4 class="text-xs font-bold group-hover:text-cyan-300 transition-colors line-clamp-1" style="color: var(--text-main);">${sub.name}</h4>
                ${sub.hindiName ? `<p class="text-[10px] truncate mt-0.5" style="color: var(--text-muted);">${sub.hindiName}</p>` : ''}
              </div>
              <div class="mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-semibold" style="color: var(--text-link); border-color: var(--glass-border);">
                <span>Start Test</span>
                <span class="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.warn('Could not load student profile for dashboard:', err);
    }
  }

  // =========================================
  // NAYA: DYNAMIC STUDY PLAN GENERATOR
  // =========================================
  function loadStudyPlan(profile) {
    const list = document.getElementById('studyPlanList');
    if (!list) return;
    
    const subjects = profile.selectedSubjects || [];
    if (subjects.length === 0) {
      list.innerHTML = '<li class="py-3 text-center text-xs" style="color: var(--text-muted);">Set up subjects to get a study plan.</li>';
      return;
    }

    const timeSlots = ['45 min', '60 min', '30 min', '90 min'];
    const actions = ['Revise Chapter 1', 'Practice Mock Test', 'Read Textbook', 'Solve PYQs'];
    
    let html = '';
    const numTasks = Math.min(subjects.length, 3); 
    
    for (let i = 0; i < numTasks; i++) {
      const sub = subjects[i];
      const time = timeSlots[i % timeSlots.length];
      const action = actions[i % actions.length];
      const icon = sub.icon || '📚';
      
      html += `
        <li class="flex justify-between items-center p-3 rounded-xl glass-inner mb-2 border border-white/5 hover:border-white/10 transition group cursor-pointer" onclick="window.location.href='test-select.html?subject=${encodeURIComponent(sub.code)}'">
          <div class="flex items-center gap-3">
            <span class="text-xl">${icon}</span>
            <span class="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">${sub.name} — ${action}</span>
          </div>
          <span class="text-xs font-bold text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md">${time}</span>
        </li>
      `;
    }
    list.innerHTML = html;
  }

  // =========================================
  // 3. NOTIFICATIONS
  // =========================================
  async function loadNotifications() {
    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');
    if (!notifBtn || !notifPanel || !window.API?.tests) return;

    try {
      const res = await window.API.tests.getNotifications(10);
      const notifications = res.notifications || [];
      const unreadCount = res.unreadCount || 0;

      let dot = notifBtn.querySelector('.notif-dot');
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'notif-dot absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 border-2';
        dot.style.borderColor = 'var(--bg-color)';
        notifBtn.appendChild(dot);
      }
      dot.style.display = unreadCount > 0 ? 'block' : 'none';

      const listHtml = notifications.length === 0
        ? '<div class="p-4 text-center text-xs" style="color: var(--text-muted);">No new notifications</div>'
        : notifications.map((n) => `
            <div onclick="handleNotifClick('${n._id}', '${n.link || 'test-results.html'}')"
                 class="dropdown-item cursor-pointer p-2.5 rounded-lg transition flex items-start gap-2.5 ${n.isRead ? 'opacity-70' : ''}">
              <div class="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center text-xs shrink-0 mt-0.5">
                ${n.type === 'analysis_ready' ? '📊' : '🔔'}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold leading-tight" style="color: var(--text-main);">${n.title}</p>
                <p class="text-[11px] truncate mt-0.5" style="color: var(--text-muted);">${n.message}</p>
              </div>
            </div>
          `).join('');

      notifPanel.innerHTML = `
        <div class="flex items-center justify-between px-3 py-2 border-b mb-1" style="border-color: var(--glass-border);">
          <p class="text-xs font-bold" style="color: var(--text-main);">Notifications</p>
          ${unreadCount > 0 ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded" style="color: var(--text-link); background: var(--inner-glass-bg);">${unreadCount} new</span>` : ''}
        </div>
        <div class="max-h-64 overflow-y-auto space-y-1 p-1">${listHtml}</div>
      `;

      notifBtn.onclick = (e) => { e.stopPropagation(); notifPanel.classList.toggle('hidden'); };
      document.addEventListener('click', (e) => { if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) notifPanel.classList.add('hidden'); });
    } catch (e) { console.warn('Could not load notifications:', e); }
  }

  window.handleNotifClick = async function(id, link) {
    try { await window.API.tests.markNotificationRead(id); } catch (e) { }
    if (link) window.location.href = link;
  };

  // =========================================
  // 4. RECENT TESTS (MATCHES UI)
  // =========================================
  async function loadRecentTests() {
    const recentSec = document.getElementById('studentRecentTests');
    if (!recentSec || !window.API?.tests) return;

    const resultsCountBadge = document.getElementById('myResultsCount');

    try {
      const res = await window.API.tests.getRecentResults(20);
      const results = res.results || [];
      
      if (resultsCountBadge) {
        if (results.length > 0) {
          resultsCountBadge.textContent = results.length;
          resultsCountBadge.classList.remove('hidden');
        } else {
          resultsCountBadge.classList.add('hidden');
        }
      }

      const ul = recentSec.querySelector('ul');
      if (!ul) return;

      if (results.length === 0) {
        ul.innerHTML = `<li class="py-4 text-center text-xs" style="color: var(--text-muted);">No tests attempted yet. Choose a subject above to start your first mock!</li>`;
        return;
      }

      const topResults = results.slice(0, 4);

      ul.innerHTML = topResults.map((r) => {
        // 👇 NAYA: Recent tests me bhi Combined Score dikhao
        const score = r.combinedScore || r.score || {};
        const pct = score.percentage || 0;
        
        let badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if (pct < 50) badgeClass = 'bg-red-500/20 text-red-400 border-red-500/30';
        else if (pct < 75) badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        
        const title = r.chapterTitle || (r.chapterNumber ? `Ch ${r.chapterNumber}` : 'Mock');

        return `
          <li onclick="window.location.href='test-results.html?attemptId=${r.attemptId}'"
              class="flex justify-between items-center py-3 border-b border-white/5 hover:bg-white/[0.02] px-2 rounded cursor-pointer group transition-colors" style="border-color: var(--glass-border);">
            <span class="text-sm font-semibold group-hover:text-cyan-400 transition-colors" style="color: var(--text-main);">
              ${r.subjectName || r.subjectCode} (${title})
            </span>
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold" style="color: var(--text-muted);">${score.obtainedMarks || 0}/${score.totalMarks || 0}</span>
              <span class="px-2.5 py-1 text-[10px] font-black uppercase rounded-full border ${badgeClass}">DONE</span>
            </div>
          </li>
        `;
      }).join('');
    } catch (e) { console.warn('Could not load recent tests:', e); }
  }

  // =========================================
  // 5. INIT FUNCTION
  // =========================================
  function init() {
    var testSec = document.getElementById('studentTestSection');
    if (testSec) testSec.classList.remove('hidden');

    var recentSec = document.getElementById('studentRecentTests');
    if (recentSec) recentSec.classList.remove('hidden');

    var roleTag = document.getElementById('sideRoleTag');
    if (roleTag) roleTag.textContent = 'Student';

    var welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg && !welcomeMsg.textContent.trim()) {
      welcomeMsg.textContent = "Let's ace your next exam. Here's your progress.";
    }
    
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';
    
    const welcomeTimeEl = document.getElementById('welcomeTime');
    if (welcomeTimeEl) welcomeTimeEl.textContent = greeting;

    if (window.API && window.API.User) {
        const user = window.API.User.get();
        if (user && user.name) {
            const welcomeNameEl = document.getElementById('welcomeName');
            if (welcomeNameEl) welcomeNameEl.textContent = user.name.split(' ')[0];
            const profileNameEl = document.getElementById('profileName');
            if (profileNameEl) profileNameEl.textContent = user.name;
            const panelNameEl = document.getElementById('panelName');
            if (panelNameEl) panelNameEl.textContent = user.name;
            const panelEmailEl = document.getElementById('panelEmail');
            if (panelEmailEl) panelEmailEl.textContent = user.email;
            const avatarLetterEl = document.getElementById('avatarLetter');
            if (avatarLetterEl) avatarLetterEl.textContent = user.name.charAt(0).toUpperCase();
        }
    }

    loadDashboardStats();
    loadStudentAcademicData();
    loadNotifications();
    loadRecentTests();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();