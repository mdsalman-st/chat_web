/**
 * ============================================================================
 * AUTH.JS — Secure Account Creation
 * ============================================================================
 * Handles:
 * 1. Form validation (name, phone, email, password)
 * 2. OTP simulation (demo: 123456)
 * 3. Password hashing: bcrypt + salt + pepper
 * 4. Session token generation (JWT-like)
 * 5. localStorage persistence
 * ============================================================================
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------------ */
  const PEPPER = 'nexus_pepper_v1_K9$mX2#pL7@wQ4';
  const BCRYPT_ROUNDS = 12;
  const DEMO_OTP = '123456';
  const STORAGE_KEYS = {
    USER: 'nexus_user',
    TOKEN: 'nexus_token',
  };

  /* ------------------------------------------------------------------------
     STATE
     ------------------------------------------------------------------------ */
  const state = {
    otpSent: false,
    otpVerified: false,
  };

  /* ------------------------------------------------------------------------
     ELEMENTS
     ------------------------------------------------------------------------ */
  const form         = document.getElementById('authForm');
  const inpName      = document.getElementById('inpName');
  const inpPhone     = document.getElementById('inpPhone');
  const inpOtp       = document.getElementById('inpOtp');
  const inpEmail     = document.getElementById('inpEmail');
  const inpPassword  = document.getElementById('inpPassword');
  const btnOtp       = document.getElementById('btnOtp');
  const otpHint      = document.getElementById('otpHint');
  const otpWrap      = document.getElementById('otpWrap');
  const togglePwd    = document.getElementById('togglePwd');
  const submitBtn    = document.getElementById('submitBtn');
  const submitText   = document.getElementById('submitText');
  const strengthText = document.getElementById('strengthText');
  const strengthBars = document.querySelectorAll('.strength-bar');

  /* ------------------------------------------------------------------------
     HELPERS
     ------------------------------------------------------------------------ */
  function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%) translateY(20px)',
      background: type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#111827',
      color: '#fff',
      padding: '0.75rem 1.25rem',
      borderRadius: '12px',
      fontSize: '0.85rem',
      fontWeight: '600',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity 0.3s, transform 0.3s',
      pointerEvents: 'none',
      maxWidth: '90vw',
      textAlign: 'center',
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

  function generateSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function generateSessionToken(payload) {
    const enc = (obj) =>
      btoa(JSON.stringify(obj))
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const header = { alg: 'HS256', typ: 'JWT' };
    const body = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    };

    const signature = btoa(`${enc(header)}.${enc(body)}.${PEPPER}`)
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${enc(header)}.${enc(body)}.${signature}`;
  }

  /* ------------------------------------------------------------------------
     PASSWORD STRENGTH
     ------------------------------------------------------------------------ */
  function calcStrength(pwd) {
    let score = 0;
    if (!pwd) return 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 4);
  }

  function updateStrength() {
    const pwd = inpPassword.value;
    const score = calcStrength(pwd);

    const colors = ['#475569', '#dc2626', '#f59e0b', '#3b82f6', '#22c55e'];
    const labels = ['Enter a password', 'Weak', 'Fair', 'Good', 'Strong'];

    strengthBars.forEach((bar, i) => {
      bar.style.background = i < score ? colors[score] : 'rgba(255,255,255,0.05)';
    });

    strengthText.textContent = labels[score];
    strengthText.style.color = score > 0 ? colors[score] : '#64748b';
  }

  /* ------------------------------------------------------------------------
     VALIDATION
     ------------------------------------------------------------------------ */
  function isPhoneValid(v) {
    return /^[6-9]\d{9}$/.test(v);
  }

  function isEmailValid(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function isFormValid() {
    return (
      inpName.value.trim().length >= 2 &&
      isPhoneValid(inpPhone.value.trim()) &&
      state.otpVerified &&
      isEmailValid(inpEmail.value.trim()) &&
      inpPassword.value.length >= 8
    );
  }

  function updateSubmitState() {
    submitBtn.disabled = !isFormValid();
  }

  /* ------------------------------------------------------------------------
     OTP FLOW (demo)
     ------------------------------------------------------------------------ */
  btnOtp.addEventListener('click', () => {
    const phone = inpPhone.value.trim();

    if (!isPhoneValid(phone)) {
      showToast('Enter a valid 10-digit phone number', 'error');
      inpPhone.focus();
      return;
    }

    state.otpSent = true;
    btnOtp.disabled = true;
    btnOtp.textContent = 'Sent ✓';

    otpHint.classList.remove('hidden');
    otpWrap.hidden = false;
    setTimeout(() => inpOtp.focus(), 120);

    showToast(`OTP sent to +91 ${phone}`, 'success');
  });

  inpOtp.addEventListener('input', () => {
    const val = inpOtp.value.replace(/\D/g, '');
    inpOtp.value = val;

    if (val.length === 6) {
      if (val === DEMO_OTP) {
        state.otpVerified = true;
        inpOtp.style.borderColor = '#22c55e';
        showToast('OTP verified ✓', 'success');
      } else {
        state.otpVerified = false;
        inpOtp.style.borderColor = '#dc2626';
        showToast('Invalid OTP', 'error');
      }
      updateSubmitState();
    }
  });

  /* ------------------------------------------------------------------------
     PASSWORD TOGGLE
     ------------------------------------------------------------------------ */
  togglePwd.addEventListener('click', () => {
    const isPwd = inpPassword.type === 'password';
    inpPassword.type = isPwd ? 'text' : 'password';
    togglePwd.textContent = isPwd ? '🙈' : '👁️';
  });

  /* ------------------------------------------------------------------------
     LIVE VALIDATION
     ------------------------------------------------------------------------ */
  [inpName, inpPhone, inpEmail, inpPassword].forEach((el) => {
    el.addEventListener('input', updateSubmitState);
  });

  inpPhone.addEventListener('input', () => {
    inpPhone.value = inpPhone.value.replace(/\D/g, '').slice(0, 10);
  });

  inpPassword.addEventListener('input', updateStrength);

  /* ------------------------------------------------------------------------
     SUBMIT
     ------------------------------------------------------------------------ */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isFormValid()) {
      showToast('Please complete all fields', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitText.textContent = 'Hashing…';

    try {
      const password = inpPassword.value;
      const salt = generateSalt();

      // bcryptjs
      const combined = password + PEPPER;
      const finalSalt = await bcrypt.genSalt(BCRYPT_ROUNDS);
      const finalHash = await bcrypt.hash(combined, finalSalt);

      const user = {
        name: inpName.value.trim(),
        phone: '+91' + inpPhone.value.trim(),
        email: inpEmail.value.trim().toLowerCase(),
        salt: finalSalt,
        hash: finalHash,
        createdAt: new Date().toISOString(),
      };

      const token = generateSessionToken({
        sub: user.email,
        name: user.name,
      });

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);

      submitText.textContent = 'Account Created ✓';

      console.log('%c🔐 AUTH SUCCESS', 'color:#22d3ee;font-weight:bold');
      console.log('Salt:', finalSalt);
      console.log('Hash:', finalHash);
      console.log('Token:', token);

      showToast('Account secured successfully', 'success');

      setTimeout(() => {
        document.body.style.transition = 'opacity 0.35s ease';
        document.body.style.opacity = '0';
        setTimeout(() => {
          window.location.href = 'details.html';
        }, 320);
      }, 900);

    } catch (err) {
      console.error(err);
      submitText.textContent = 'Create Account';
      submitBtn.disabled = false;
      showToast('Something went wrong. Try again.', 'error');
    }
  });

  /* ------------------------------------------------------------------------
     PARTICLES
     ------------------------------------------------------------------------ */
  (function spawnParticles() {
    const wrap = document.getElementById('particles');
    if (!wrap) return;
    const count = 22;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top  = (100 + Math.random() * 20) + '%';
      p.style.animationDuration = (14 + Math.random() * 16) + 's';
      p.style.animationDelay    = (-Math.random() * 25) + 's';
      const s = 1 + Math.random() * 2;
      p.style.width  = s + 'px';
      p.style.height = s + 'px';
      wrap.appendChild(p);
    }
  })();

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  updateStrength();
  updateSubmitState();

})();