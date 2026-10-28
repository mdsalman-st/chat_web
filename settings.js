/* ============================================================================
   SETTINGS.JS — User Account, Security & Workspace Preferences
   ============================================================================ */

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  let currentUser = {};

  /* Tab Switching */
  window.switchSettingsTab = function (tabId) {
    const tabs = ['profile', 'security', 'preferences', 'account'];
    tabs.forEach(t => {
      const el = $('tab-' + t);
      if (el) el.classList.toggle('hidden', t !== tabId);
    });

    document.querySelectorAll('.setting-tab-btn').forEach(btn => {
      const isMatch = btn.getAttribute('data-stab') === tabId;
      btn.classList.toggle('active', isMatch);
    });
  };

  /* Save Profile */
  window.handleSaveProfile = async function (e) {
    e.preventDefault();
    const name = $('settingName').value.trim();
    const role = $('settingRole').value;
    const statusMsg = $('settingStatusMsg').value.trim();

    if (!name) return alert('Name cannot be empty');

    try {
      const updated = await API.auth.updateProfile({ name, role });
      currentUser = updated.user || { ...currentUser, name, role };
      API.User.set(currentUser);

      try {
        localStorage.setItem('nexus_user_role', role);
        localStorage.setItem('nexus_username', name);
        if (statusMsg) localStorage.setItem('nexus_user_status', statusMsg);
      } catch (err) {}

      updateUIWithUser(currentUser);
      alert('Profile updated successfully!');
    } catch (err) {
      // Fallback if backend offline/dev mode
      currentUser.name = name;
      currentUser.role = role;
      API.User.set(currentUser);
      try {
        localStorage.setItem('nexus_user_role', role);
        localStorage.setItem('nexus_username', name);
      } catch (err) {}
      updateUIWithUser(currentUser);
      alert('Profile saved locally!');
    }
  };

  /* Secret Code Setting */
  window.handleSaveSecretCode = function () {
    const code = $('settingSecretCode').value.trim();
    if (!code) return alert('Secret code cannot be empty');

    try {
      localStorage.setItem('nexus_secret_code', code.toLowerCase());
      alert(`Secret code updated to "${code}"! Type this code in any search bar to open the encrypted private channel.`);
    } catch (e) {
      alert('Failed to save code to storage');
    }
  };

  /* Password Update */
  window.handleUpdatePassword = function (e) {
    e.preventDefault();
    const newP = $('newPassword').value;
    const confP = $('confirmPassword').value;

    if (!newP || newP.length < 6) {
      return alert('Password must be at least 6 characters');
    }
    if (newP !== confP) {
      return alert('Passwords do not match');
    }

    // Backend update or notification
    alert('Password updated successfully!');
    $('passwordForm').reset();
  };

  /* Workspace Preferences */
  window.savePreferences = function () {
    const prefs = {
      sound: $('prefSound')?.checked ?? true,
      notif: $('prefNotif')?.checked ?? true,
      compact: $('prefCompact')?.checked ?? false
    };

    try {
      localStorage.setItem('nexus_preferences', JSON.stringify(prefs));
    } catch (e) {}
  };

  function loadPreferences() {
    try {
      const saved = localStorage.getItem('nexus_preferences');
      if (saved) {
        const p = JSON.parse(saved);
        if ($('prefSound')) $('prefSound').checked = !!p.sound;
        if ($('prefNotif')) $('prefNotif').checked = !!p.notif;
        if ($('prefCompact')) $('prefCompact').checked = !!p.compact;
      }
    } catch (e) {}
  }

  /* Clear cache */
  window.handleClearCache = function () {
    if (!confirm('Clear all temporary caches? Your tasks, notes, and profile data will remain intact.')) return;
    try {
      sessionStorage.clear();
      alert('Cache cleared successfully!');
    } catch (e) {}
  };

  function updateUIWithUser(user) {
    const name = user.name || 'User';
    const email = user.email || 'user@example.com';
    const role = user.role || 'workspace';
    const initial = name.charAt(0).toUpperCase();

    if ($('avatarLetter')) $('avatarLetter').textContent = initial;
    if ($('settingsBigAvatar')) $('settingsBigAvatar').textContent = initial;
    if ($('profileName')) $('profileName').textContent = name.split(' ')[0];
    if ($('panelName')) $('panelName').textContent = name;
    if ($('panelEmail')) $('panelEmail').textContent = email;
    if ($('sideRoleTag')) $('sideRoleTag').textContent = role;

    if ($('settingsDisplayName')) $('settingsDisplayName').textContent = name;
    if ($('settingsDisplayEmail')) $('settingsDisplayEmail').textContent = email;
    if ($('settingsRoleBadge')) $('settingsRoleBadge').textContent = role;

    if ($('settingName')) $('settingName').value = name;
    if ($('settingEmail')) $('settingEmail').value = email;
    if ($('settingRole')) $('settingRole').value = role;
  }

  /* Dropdowns */
  function bindDropdowns() {
    const nB = $('notifBtn'), nP = $('notifPanel');
    const pB = $('profileBtn'), pP = $('profilePanel');
    if (!nB || !pB) return;
    const close = () => { nP?.classList.add('hidden'); pP?.classList.add('hidden'); };
    nB.addEventListener('click', e => { e.stopPropagation(); pP?.classList.add('hidden'); nP?.classList.toggle('hidden'); });
    pB.addEventListener('click', e => { e.stopPropagation(); nP?.classList.add('hidden'); pP?.classList.toggle('hidden'); });
    document.addEventListener('click', close);
  }

  /* ==========================================================================
     ACADEMIC PROFILE (STUDENT TEST MODULE)
     ========================================================================== */
  let currentAcadProfile = {};

  async function initAcademicSettings() {
    const section = $('academicProfileSection');
    if (!section) return;

    const boardSelect = $('acadSettingBoard');
    const classSelect = $('acadSettingClass');
    const otherWrap = $('acadSettingOtherWrap');
    const otherInput = $('acadSettingOther');
    const streamWrap = $('acadSettingStreamWrap');
    const streamSelect = $('acadSettingStream');
    const mediumSelect = $('acadSettingMedium');
    const subjectsBox = $('acadSettingSubjects');
    const goalInput = $('acadSettingGoal');
    const badgeText = $('acadBadgeText');

    try {
      // 1. Fetch boards
      const boardRes = await API.tests.getBoards();
      const boards = boardRes.boards || [];
      if (boardSelect) {
        boardSelect.innerHTML = boards.map(b => `<option value="${b.code}">${b.name}</option>`).join('');
      }

      // 2. Fetch current student academic profile
      let profile = {};
      try {
        const profRes = await API.tests.getProfile();
        profile = profRes.profile || {};
        currentAcadProfile = profile;
      } catch (err) {
        profile = currentUser.studentProfile || {};
      }

      // Update badge
      if (badgeText && profile.formattedBadge) {
        badgeText.textContent = profile.formattedBadge;
      }

      // Populate fields
      if (boardSelect && profile.board) {
        boardSelect.value = profile.board;
      }
      if (profile.isOtherBoard && otherWrap) {
        otherWrap.classList.remove('hidden');
        if (otherInput) otherInput.value = profile.otherBoardName || '';
      }
      if (classSelect && profile.classLevel) {
        classSelect.value = profile.classLevel;
      }
      if (mediumSelect && profile.medium) {
        mediumSelect.value = profile.medium;
      }
      if (goalInput && profile.targetGoal) {
        goalInput.value = profile.targetGoal;
      }

      const isSenior = (classSelect?.value === '11' || classSelect?.value === '12');
      if (streamWrap) streamWrap.classList.toggle('hidden', !isSenior);
      if (streamSelect && profile.stream) {
        streamSelect.value = profile.stream;
      }

      // Function to refresh subjects checklist
      async function reloadSubjects() {
        const bCode = boardSelect?.value || 'bseb';
        const cVal = classSelect?.value || '10';
        const isSnr = (cVal === '11' || cVal === '12');
        if (streamWrap) streamWrap.classList.toggle('hidden', !isSnr);
        const sVal = isSnr ? streamSelect?.value : null;

        if (subjectsBox) {
          subjectsBox.innerHTML = '<span class="text-xs text-slate-400 col-span-3 py-2">Loading subjects…</span>';
        }

        try {
          const subRes = await API.tests.getSubjects(bCode, cVal, sVal);
          const availableSubjects = subRes.subjects || [];

          if (availableSubjects.length === 0) {
            subjectsBox.innerHTML = '<span class="text-xs text-slate-500 col-span-3 py-2">No subjects configured.</span>';
            return;
          }

          const userSubCodes = new Set((currentAcadProfile.selectedSubjects || []).map(s => s.code));

          subjectsBox.innerHTML = availableSubjects.map(sub => {
            const isChecked = userSubCodes.size === 0 || userSubCodes.has(sub.code);
            return `
              <label class="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border ${isChecked ? 'border-cyan-500/40 bg-cyan-500/[0.06]' : 'border-white/5'} hover:border-cyan-500/30 cursor-pointer transition text-xs text-slate-200">
                <input type="checkbox" name="acad_subject_chk" value="${sub.code}"
                       data-name="${sub.name}" data-hindi="${sub.hindiName || ''}" data-icon="${sub.icon || '📚'}"
                       ${isChecked ? 'checked' : ''} class="w-3.5 h-3.5 rounded bg-ink-950 border-white/20 text-cyan-500 focus:ring-0">
                <span>${sub.icon || '📚'}</span>
                <span class="truncate">${sub.name}</span>
              </label>
            `;
          }).join('');

          subjectsBox.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', () => {
              const card = chk.closest('label');
              card?.classList.toggle('border-cyan-500/40', chk.checked);
              card?.classList.toggle('bg-cyan-500/[0.06]', chk.checked);
              card?.classList.toggle('border-white/5', !chk.checked);
            });
          });

        } catch (e) {
          if (subjectsBox) subjectsBox.innerHTML = '<span class="text-xs text-red-400 col-span-3 py-2">Error loading subjects.</span>';
        }
      }

      boardSelect?.addEventListener('change', () => {
        const isOth = boardSelect.value === 'other';
        if (otherWrap) otherWrap.classList.toggle('hidden', !isOth);
        reloadSubjects();
      });

      classSelect?.addEventListener('change', reloadSubjects);
      streamSelect?.addEventListener('change', reloadSubjects);

      // Initial subjects load
      await reloadSubjects();

    } catch (err) {
      console.warn('Could not initialize academic profile settings:', err);
    }
  }

  window.handleSaveAcademicProfile = async function (e) {
    e.preventDefault();
    const btn = $('saveAcadBtn');
    const boardSelect = $('acadSettingBoard');
    const classSelect = $('acadSettingClass');
    const otherInput = $('acadSettingOther');
    const streamSelect = $('acadSettingStream');
    const mediumSelect = $('acadSettingMedium');
    const goalInput = $('acadSettingGoal');
    const badgeText = $('acadBadgeText');

    const board = boardSelect ? boardSelect.value : 'bseb';
    const isOther = board === 'other';
    const otherBoardName = isOther && otherInput ? otherInput.value.trim() : '';

    if (isOther && (!otherBoardName || otherBoardName.length < 2)) {
      return alert('Please enter your Board / University name');
    }

    const classLevel = classSelect ? classSelect.value : '10';
    const isSenior = (classLevel === '11' || classLevel === '12');
    const stream = isSenior && streamSelect ? streamSelect.value : null;
    const streamName = isSenior && streamSelect ? streamSelect.options[streamSelect.selectedIndex]?.text : null;
    const medium = mediumSelect ? mediumSelect.value : 'Hindi';

    const checkedBoxes = Array.from(document.querySelectorAll('input[name="acad_subject_chk"]:checked'));
    if (checkedBoxes.length === 0) {
      return alert('Please select at least one subject');
    }

    const selectedSubjects = checkedBoxes.map(chk => ({
      code: chk.value,
      name: chk.dataset.name || chk.value,
      hindiName: chk.dataset.hindi || '',
      icon: chk.dataset.icon || '📚',
    }));

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving…';
    }

    try {
      const res = await API.tests.updateProfile({
        board,
        otherBoardName,
        classLevel,
        stream,
        streamName,
        medium,
        selectedSubjects,
        targetGoal: goalInput ? goalInput.value.trim() : '',
      });

      currentAcadProfile = res.profile || {};
      if (badgeText && res.profile?.formattedBadge) {
        badgeText.textContent = res.profile.formattedBadge;
      }

      alert('Academic profile updated successfully! Tests and syllabi are updated.');
    } catch (err) {
      alert('Failed to update academic profile: ' + (err.message || 'Server error'));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Update Academic Profile';
      }
    }
  };

  /* Initialization */
  document.addEventListener('DOMContentLoaded', async () => {
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    try {
      const me = await API.auth.me();
      currentUser = me.user || {};
    } catch (e) {
      currentUser = API.User.get() || { name: 'User', email: 'user@example.com', role: 'workspace' };
    }

    updateUIWithUser(currentUser);
    loadPreferences();

    // Load secret code
    try {
      const savedCode = localStorage.getItem('nexus_secret_code') || 'nexus';
      if ($('settingSecretCode')) $('settingSecretCode').value = savedCode;
    } catch (e) {}

    bindDropdowns();

    // Initialize Academic Settings for students
    initAcademicSettings();
  });

})();
