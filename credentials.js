/**
 * ============================================================================
 * CREDENTIALS.JS — Username & Secret Code Setup (Backend Connected)
 * ============================================================================
 */

(function () {
  'use strict';

  const NEXT_PAGE = 'dashboard.html';
  const WORDS = ['ghost', 'alpha', 'delta', 'nova', 'raven', 'phoenix', 'cypher', 'titan', 'shadow', 'zenith'];
  const NUMS  = ['77', '99', '42', '21', '00', '88', '13', '55', '03', '07'];

  const $ = id => document.getElementById(id);

  const state = {
    usernameOK: false,
    secretOK: false,
    confirmOK: false,
  };

  /* ------------------------------------------------------------------------
     TOAST
     ------------------------------------------------------------------------ */
  function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', bottom: '24px', left: '50%',
      transform: 'translateX(-50%) translateY(20px)',
      background: type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#111827',
      color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '12px',
      fontSize: '0.85rem', fontWeight: '600',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: '9999',
      opacity: '0', transition: 'opacity 0.3s, transform 0.3s',
      pointerEvents: 'none', maxWidth: '90vw', textAlign: 'center',
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => t.remove(), 350);
    }, 2400);
  }

  function shake(el) {
    if (!el) return;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 450);
  }

  /* ------------------------------------------------------------------------
     USERNAME VALIDATION — Backend Check
     ------------------------------------------------------------------------ */
  const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
  let usernameTimer = null;

  async function validateUsername() {
    const inp = $('inpUsername');
    const dot = $('userDot');
    const hint = $('userHint');
    if (!inp || !dot || !hint) return;

    const val = inp.value.trim();

    if (!val) {
      dot.className = 'status-dot idle';
      hint.textContent = '3–20 characters, letters, numbers, underscore';
      state.usernameOK = false;
      updateSubmit();
      return;
    }

    if (!USERNAME_RE.test(val)) {
      dot.className = 'status-dot taken';
      hint.textContent = 'Invalid: only letters, numbers, underscore (3–20)';
      state.usernameOK = false;
      updateSubmit();
      return;
    }

    dot.className = 'status-dot checking';
    hint.textContent = 'Checking availability…';
    state.usernameOK = false;
    updateSubmit();

    clearTimeout(usernameTimer);
    usernameTimer = setTimeout(async () => {
      try {
        const res = await API.auth.checkUsername(val);
        if (res.available) {
          dot.className = 'status-dot available';
          hint.textContent = 'Available ✓';
          state.usernameOK = true;
        } else {
          dot.className = 'status-dot taken';
          hint.textContent = 'This username is already taken';
          state.usernameOK = false;
        }
      } catch (err) {
        dot.className = 'status-dot idle';
        hint.textContent = 'Check failed — try again';
        state.usernameOK = false;
      }
      updateSubmit();
    }, 500);
  }

  /* ------------------------------------------------------------------------
     SECRET CODE VALIDATION
     ------------------------------------------------------------------------ */
  function validateSecret() {
    const inp = $('inpSecret');
    const panel = $('secretPanel');
    if (!inp) return;

    const val = inp.value.trim();
    if (val.length >= 3) {
      state.secretOK = true;
      if (panel) panel.classList.add('ready');
    } else {
      state.secretOK = false;
      if (panel) panel.classList.remove('ready');
    }
    validateConfirm();
    updateSubmit();
  }

  function validateConfirm() {
    const s = $('inpSecret');
    const c = $('inpSecretConfirm');
    const hint = $('confirmHint');
    if (!s || !c || !hint) return;

    const sv = s.value.trim();
    const cv = c.value.trim();

    if (!cv) {
      hint.classList.add('hidden');
      state.confirmOK = false;
      updateSubmit();
      return;
    }

    if (sv === cv) {
      hint.classList.remove('hidden');
      hint.textContent = '✓ Codes match';
      hint.style.color = '#22c55e';
      state.confirmOK = true;
    } else {
      hint.classList.remove('hidden');
      hint.textContent = '✗ Codes do not match';
      hint.style.color = '#dc2626';
      state.confirmOK = false;
    }
    updateSubmit();
  }

  /* ------------------------------------------------------------------------
     SUGGESTIONS
     ------------------------------------------------------------------------ */
  function randomCode() {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    const n = NUMS[Math.floor(Math.random() * NUMS.length)];
    return w + n;
  }

  function renderSuggestions() {
    const box = $('suggestions');
    if (!box) return;
    box.innerHTML = '';
    const seen = new Set();
    while (seen.size < 4) seen.add(randomCode());

    seen.forEach((code) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'code-chip';
      chip.textContent = '✨ ' + code;
      chip.addEventListener('click', () => {
        $('inpSecret').value = code;
        $('inpSecretConfirm').value = code;
        validateSecret();
        $('inpSecret').focus();
      });
      box.appendChild(chip);
    });
  }

  /* ------------------------------------------------------------------------
     SUBMIT STATE
     ------------------------------------------------------------------------ */
  function updateSubmit() {
    const btn = $('submitBtn');
    if (btn) btn.disabled = !(state.usernameOK && state.secretOK && state.confirmOK);
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    // Auth guard
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    // Refresh user data
    API.auth.me().catch(() => {
      API.Token.remove();
      window.location.href = 'auth.html';
    });

    /* --- Username input --- */
    const inpUsername = $('inpUsername');
    if (inpUsername) {
      inpUsername.addEventListener('input', () => {
        inpUsername.value = inpUsername.value.replace(/[^a-zA-Z0-9_]/g, '');
        validateUsername();
      });
    }

    /* --- Secret inputs --- */
    const inpSecret = $('inpSecret');
    const inpSecretConfirm = $('inpSecretConfirm');
    if (inpSecret) inpSecret.addEventListener('input', validateSecret);
    if (inpSecretConfirm) inpSecretConfirm.addEventListener('input', validateConfirm);

    /* --- Generate button --- */
    const btnGenerate = $('btnGenerate');
    if (btnGenerate) {
      btnGenerate.addEventListener('click', () => {
        const code = randomCode();
        inpSecret.value = code;
        inpSecretConfirm.value = code;
        validateSecret();
        showToast('Code generated — remember it!', 'success');
      });
    }

    /* --- Form submit --- */
    const form = $('credForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = $('submitBtn');
        const btnText = $('submitText');
        if (btn.disabled) return;

        const username = inpUsername.value.trim();
        const secret = inpSecret.value.trim();

        btn.disabled = true;
        btnText.textContent = 'Saving…';

        try {
          await API.auth.updateCredentials(username, secret);

          // Also keep in localStorage for vault quick access
          try {
            localStorage.setItem('nexus_username', username);
            localStorage.setItem('nexus_secret_code', secret.toLowerCase());
          } catch (err) {}

          btnText.textContent = 'Setup Complete ✓';
          showToast('Welcome to Nexus 🚀', 'success');

          setTimeout(() => {
            document.body.style.transition = 'opacity 0.35s ease';
            document.body.style.opacity = '0';
            setTimeout(() => { window.location.href = NEXT_PAGE; }, 320);
          }, 700);
        } catch (err) {
          console.error(err);
          btn.disabled = false;
          btnText.textContent = 'Finish Setup';
          showToast(err.message || 'Save failed', 'error');
          shake(form);
        }
      });
    }

    /* --- Initial state --- */
    renderSuggestions();
    updateSubmit();

    /* ---------- Particles ---------- */
    (function spawnParticles() {
      const wrap = $('particles');
      if (!wrap) return;
      for (let i = 0; i < 22; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = (100 + Math.random() * 20) + '%';
        p.style.animationDuration = (14 + Math.random() * 16) + 's';
        p.style.animationDelay = (-Math.random() * 25) + 's';
        const s = 1 + Math.random() * 2;
        p.style.width = s + 'px';
        p.style.height = s + 'px';
        wrap.appendChild(p);
      }
    })();
  });

})();