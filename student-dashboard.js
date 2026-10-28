/**
 * Nexus — Student Dashboard logic
 * Force-shows student-only sections (AI tests, recent results) and sets labels.
 * Loads dynamic academic profile (e.g. "Class 10 • BSEB • Hindi") and enrolled subjects.
 */
(function () {
  'use strict';

  async function loadStudentAcademicData() {
    const badgeEl = document.getElementById('dashAcademicBadge');
    const gridEl = document.getElementById('dashSubjectGrid');
    if (!window.API || !window.API.tests) return;

    try {
      const res = await window.API.tests.getProfile();
      const profile = res.profile || {};

      // 1) Update academic badge
      if (badgeEl && profile.formattedBadge) {
        badgeEl.textContent = profile.formattedBadge;
      }

      // 2) Render enrolled subjects
      if (gridEl) {
        const subjects = profile.selectedSubjects || [];

        if (subjects.length === 0) {
          gridEl.innerHTML = `
            <div class="col-span-full p-4 rounded-xl bg-cyan-500/[0.05] border border-cyan-500/20 text-center">
              <p class="text-xs text-slate-300 font-semibold mb-1">Set up your curriculum subjects</p>
              <p class="text-[11px] text-slate-400 mb-3">Choose your board and subjects to unlock chapter-wise mock tests.</p>
              <a href="settings.html" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-ink-950 font-bold text-xs hover:bg-cyan-400 transition">
                Configure Subjects in Settings
              </a>
            </div>
          `;
          return;
        }

        gridEl.innerHTML = subjects.map((sub) => {
          const isLive = true; // In Phase 1/2 subjects have seeded live chapters
          return `
            <div onclick="window.location.href='test-select.html?subject=${encodeURIComponent(sub.code)}'"
                 class="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/40 hover:bg-cyan-500/[0.04] transition cursor-pointer flex flex-col justify-between group">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl">${sub.icon || '📚'}</span>
                  <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isLive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-slate-500/15 text-slate-400 border border-slate-500/25'
                  }">
                    ${isLive ? 'Live' : 'Coming soon'}
                  </span>
                </div>
                <h4 class="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">${sub.name}</h4>
                ${sub.hindiName ? `<p class="text-[10px] text-slate-400 truncate mt-0.5">${sub.hindiName}</p>` : ''}
              </div>
              <div class="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-semibold text-cyan-400">
                <span>Start Test</span>
                <span class="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.warn('Could not load student profile for dashboard:', err);
      if (gridEl) {
        gridEl.innerHTML = `
          <div class="col-span-full py-2 text-center text-xs text-slate-400">
            Select your subjects from <a href="settings.html" class="text-cyan-400 underline">Settings</a>.
          </div>
        `;
      }
    }
  }

  async function loadNotifications() {
    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');
    if (!notifBtn || !notifPanel || !window.API?.tests) return;

    try {
      const res = await window.API.tests.getNotifications(10);
      const notifications = res.notifications || [];
      const unreadCount = res.unreadCount || 0;

      // Unread dot
      let dot = notifBtn.querySelector('.notif-dot');
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'notif-dot absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 border-2 border-ink-950';
        notifBtn.appendChild(dot);
      }
      dot.style.display = unreadCount > 0 ? 'block' : 'none';

      // Panel content
      const listHtml = notifications.length === 0
        ? '<div class="p-4 text-center text-xs text-slate-500">No new notifications</div>'
        : notifications.map((n) => `
            <div onclick="handleNotifClick('${n._id}', '${n.link || 'test-results.html'}')"
                 class="dropdown-item cursor-pointer hover:bg-white/[0.04] p-2.5 rounded-lg transition flex items-start gap-2.5 ${n.isRead ? 'opacity-70' : 'bg-cyan-500/[0.03]'}">
              <div class="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-300 flex items-center justify-center text-xs shrink-0 mt-0.5">
                ${n.type === 'analysis_ready' ? '📊' : '🔔'}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-white leading-tight">${n.title}</p>
                <p class="text-[11px] text-slate-400 truncate mt-0.5">${n.message}</p>
              </div>
            </div>
          `).join('');

      notifPanel.innerHTML = `
        <div class="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] mb-1">
          <p class="text-xs font-bold text-white">Notifications</p>
          ${unreadCount > 0 ? `<span class="text-[10px] font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10">${unreadCount} new</span>` : ''}
        </div>
        <div class="max-h-64 overflow-y-auto space-y-1 p-1">
          ${listHtml}
        </div>
      `;

      // Toggle panel on click
      notifBtn.onclick = (e) => {
        e.stopPropagation();
        notifPanel.classList.toggle('hidden');
      };

      document.addEventListener('click', (e) => {
        if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
          notifPanel.classList.add('hidden');
        }
      });
    } catch (e) {
      console.warn('Could not load notifications:', e);
    }
  }

  window.handleNotifClick = async function(id, link) {
    try {
      await window.API.tests.markNotificationRead(id);
    } catch (e) { /* silent */ }
    if (link) window.location.href = link;
  };

  async function loadRecentTests() {
    const recentSec = document.getElementById('studentRecentTests');
    if (!recentSec || !window.API?.tests) return;

    try {
      const res = await window.API.tests.getRecentResults(5);
      const results = res.results || [];
      const ul = recentSec.querySelector('ul');
      if (!ul) return;

      if (results.length === 0) {
        ul.innerHTML = `
          <li class="py-4 text-center text-xs text-slate-500">
            No tests attempted yet. Choose a subject above to start your first mock!
          </li>
        `;
        return;
      }

      ul.innerHTML = results.map((r) => {
        const score = r.score || {};
        const pct = score.percentage || 0;
        const colorClass = pct >= 75 ? 'text-emerald-400' : (pct >= 50 ? 'text-amber-400' : 'text-red-400');
        const title = r.chapterTitle || (r.chapterNumber ? `Ch ${r.chapterNumber}` : 'Full Test');

        return `
          <li onclick="window.location.href='test-results.html?attemptId=${r.attemptId}'"
              class="flex justify-between items-center text-xs border-b border-white/5 py-2 hover:bg-white/[0.02] px-1 rounded cursor-pointer group">
            <div class="flex-1 min-w-0 pr-2">
              <span class="text-slate-200 font-semibold group-hover:text-cyan-300 transition-colors block truncate">
                ${r.subjectName || r.subjectCode} (${title})
              </span>
              <span class="text-[10px] text-slate-500">
                ${score.correct || 0}/${r.totalQuestions || 0} correct
              </span>
            </div>
            <span class="${colorClass} font-black text-sm shrink-0">${pct}%</span>
          </li>
        `;
      }).join('');
    } catch (e) {
      console.warn('Could not load recent tests:', e);
    }
  }

  function init() {
    // 1) Force-show student-only sections
    var testSec = document.getElementById('studentTestSection');
    if (testSec) testSec.classList.remove('hidden');

    var recentSec = document.getElementById('studentRecentTests');
    if (recentSec) recentSec.classList.remove('hidden');

    // 2) Sidebar role tag
    var roleTag = document.getElementById('sideRoleTag');
    if (roleTag) roleTag.textContent = 'Student';

    // 3) Friendly welcome message (fallback)
    var welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg && !welcomeMsg.textContent.trim()) {
      welcomeMsg.textContent = "Let's ace your next exam. Here's your progress.";
    }

    // 4) Load dynamic academic data, notifications, and recent tests
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