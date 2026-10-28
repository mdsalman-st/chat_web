/**
 * Nexus — Role Guard (bidirectional)
 * -----------------------------------------------------------------------------
 * Usage (place in <head> BEFORE the body renders):
 *
 *   <!-- student-dashboard.html -->
 *   <script src="role-guard.js" data-page="student"></script>
 *
 *   <!-- dashboard.html (staff/teacher/admin/etc.) -->
 *   <script src="role-guard.js" data-page="staff"></script>
 *
 * Behaviour:
 *   • Student page + non-student role  → redirect to dashboard.html
 *   • Staff page   + student role      → redirect to student-dashboard.html
 *   • Cross-tab role changes           → auto-reload
 * -----------------------------------------------------------------------------
 */
(function () {
  'use strict';

  // ── Detect which page we're on ────────────────────────────────────────────
  var scriptEl = document.currentScript;
  var pageType = (scriptEl && scriptEl.dataset && scriptEl.dataset.page) || '';
  if (!pageType) {
    pageType = window.location.pathname.toLowerCase().indexOf('student-dashboard') !== -1
      ? 'student'
      : 'staff';
  }

  // ── Read role from localStorage (multiple fallback keys) ──────────────────
  function getUserRole() {
    var keys = ['nexus_user', 'user', 'nexusUser', 'auth', 'currentUser'];
    for (var i = 0; i < keys.length; i++) {
      var raw = localStorage.getItem(keys[i]);
      if (raw) {
        try {
          var obj = JSON.parse(raw);
          if (obj && obj.role) return String(obj.role).toLowerCase();
        } catch (_) { /* not JSON — ignore */ }
      }
    }
    return String(localStorage.getItem('role') || '').toLowerCase();
  }

  var role = getUserRole();

  // ── Bidirectional guard ───────────────────────────────────────────────────
  if (pageType === 'student') {
    // Non-student on student page → send to staff dashboard
    if (role && role !== 'student') {
      window.location.replace('dashboard.html');
      return;
    }
  } else {
    // Student on staff page → send to student dashboard
    if (role === 'student') {
      window.location.replace('student-dashboard.html');
      return;
    }
  }

  // ── Cross-tab role change → reload ────────────────────────────────────────
  var WATCHED_KEYS = ['role', 'nexus_user', 'user', 'nexusUser', 'auth', 'currentUser'];
  window.addEventListener('storage', function (e) {
    if (!e.key) return;
    if (WATCHED_KEYS.indexOf(e.key) !== -1) {
      window.location.reload();
    }
  });

  // ── Same-tab manual role change (optional hook) ───────────────────────────
  // Agar aap apne code me role update karte ho (e.g. settings page),
  // to ye helper call karo:
  //   window.NexusRoleGuard.refresh()
  window.NexusRoleGuard = {
    refresh: function () {
      var newRole = getUserRole();
      if (pageType === 'student' && newRole && newRole !== 'student') {
        window.location.replace('dashboard.html');
      } else if (pageType !== 'student' && newRole === 'student') {
        window.location.replace('student-dashboard.html');
      }
    }
  };
})();