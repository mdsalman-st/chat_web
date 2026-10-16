/**
 * ============================================================================
 * PROFESSION PAGE SCRIPT
 * ============================================================================
 * Handles:
 * 1. Profession card selection
 * 2. Custom role input (for "other")
 * 3. Save selection to localStorage
 * 4. Navigate to next page (auth.html)
 * ============================================================================
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'nexus_user_role';
  const STORAGE_CUSTOM = 'nexus_custom_role';
  const NEXT_PAGE = 'auth.html';

  /* ------------------------------------------------------------------------
     STATE
     ------------------------------------------------------------------------ */
  let selectedRole = null;

  /* ------------------------------------------------------------------------
     ELEMENTS
     ------------------------------------------------------------------------ */
  const grid = document.getElementById('profGrid');
  const cards = grid ? grid.querySelectorAll('.prof-card') : [];
  const continueBtn = document.getElementById('continueBtn');
  const customWrap = document.getElementById('customRoleWrap');
  const customInput = document.getElementById('customRoleInput');

  /* ------------------------------------------------------------------------
     SELECTION
     ------------------------------------------------------------------------ */
  function selectCard(card) {
    // Remove active from all
    cards.forEach((c) => c.classList.remove('active'));

    // Add active to clicked
    card.classList.add('active');

    selectedRole = card.dataset.role;

    // Show/hide custom input
    if (selectedRole === 'other') {
      customWrap.hidden = false;
      setTimeout(() => customInput.focus(), 150);
    } else {
      customWrap.hidden = true;
      customInput.value = '';
    }

    updateContinueBtn();
  }

  function updateContinueBtn() {
    if (!continueBtn) return;

    if (!selectedRole) {
      continueBtn.disabled = true;
      return;
    }

    // If "other" selected, require custom text
    if (selectedRole === 'other') {
      const custom = (customInput.value || '').trim();
      continueBtn.disabled = custom.length < 2;
    } else {
      continueBtn.disabled = false;
    }
  }

  /* ------------------------------------------------------------------------
     BIND EVENTS
     ------------------------------------------------------------------------ */
  cards.forEach((card) => {
    card.addEventListener('click', () => selectCard(card));
  });

  if (customInput) {
    customInput.addEventListener('input', updateContinueBtn);
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !continueBtn.disabled) {
        continueBtn.click();
      }
    });
  }

  /* ------------------------------------------------------------------------
     CONTINUE
     ------------------------------------------------------------------------ */
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      if (!selectedRole) return;

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, selectedRole);

        if (selectedRole === 'other') {
          localStorage.setItem(STORAGE_CUSTOM, (customInput.value || '').trim());
        } else {
          localStorage.removeItem(STORAGE_CUSTOM);
        }
      } catch (e) { /* ignore */ }

      // Fade out + navigate
      document.body.style.transition = 'opacity 0.35s ease';
      document.body.style.opacity = '0';

      setTimeout(() => {
        window.location.href = NEXT_PAGE;
      }, 320);
    });
  }

  /* ------------------------------------------------------------------------
     RESTORE PREVIOUS SELECTION (if user comes back)
     ------------------------------------------------------------------------ */
  function restoreSelection() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }

    if (!saved) return;

    const match = Array.from(cards).find((c) => c.dataset.role === saved);
    if (match) selectCard(match);
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', restoreSelection);

})();