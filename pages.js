/* ============================================================================
   PAGES.JS — Tab switching + form handling
   ============================================================================ */
(function () {
  'use strict';

  const TABS = ['contact', 'support', 'blog', 'about', 'privacy', 'terms'];

  function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'toast show';
    t.textContent = msg;
    t.style.background = type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#111827';
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 2400);
  }

  window.setTab = function (name) {
    if (!TABS.includes(name)) name = 'contact';

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    const t = document.getElementById('tab-' + name);
    if (t) {
      t.classList.remove('hidden');
      // Re-trigger animation
      t.style.animation = 'none';
      void t.offsetWidth;
      t.style.animation = 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards';
    }

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('tab', name);
    window.history.replaceState({}, '', url);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Contact form */
  document.addEventListener('DOMContentLoaded', () => {
    const url = new URL(window.location);
    const initial = url.searchParams.get('tab') || 'contact';
    setTab(initial);

    const form = document.getElementById('contactForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.textContent = 'Sending…';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = 'Sent ✓';
          showToast('Message sent! We\'ll reply within 24h', 'success');
          form.reset();
          setTimeout(() => { btn.textContent = 'Send Message'; btn.disabled = false; }, 1800);
        }, 900);
      });
    }

    /* Particles */
    const wrap = document.getElementById('particles');
    if (wrap) {
      for (let i = 0; i < 18; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = (100 + Math.random() * 20) + '%';
        p.style.animationDuration = (16 + Math.random() * 18) + 's';
        p.style.animationDelay = (-Math.random() * 25) + 's';
        const s = 1 + Math.random() * 2;
        p.style.width = s + 'px'; p.style.height = s + 'px';
        wrap.appendChild(p);
      }
    }
  });

})();