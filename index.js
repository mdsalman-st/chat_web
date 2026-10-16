/**
 * ============================================================================
 * NEXUS — Welcome Page Script
 * ============================================================================
 * Handles:
 * 1. Floating particle generation
 * 2. Welcome toast on first visit
 * 3. Smooth internal navigation
 * ============================================================================
 */

(function () {
  'use strict';


  /* ------------------------------------------------------------------------
     1. PARTICLE GENERATOR
     ------------------------------------------------------------------------ */
  function spawnParticles() {
    const wrap = document.getElementById('particles');
    if (!wrap) return;

    const COUNT = 25;

    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement('span');
      p.className = 'particle';

      p.style.left = Math.random() * 100 + '%';
      p.style.top  = (100 + Math.random() * 20) + '%';
      p.style.animationDuration = (14 + Math.random() * 16) + 's';
      p.style.animationDelay    = (-Math.random() * 25) + 's';

      const size = 1 + Math.random() * 2;
      p.style.width  = size + 'px';
      p.style.height = size + 'px';

      wrap.appendChild(p);
    }
  }


  /* ------------------------------------------------------------------------
     2. FIRST-VISIT HINT
     ------------------------------------------------------------------------ */
  function firstVisitHint() {
    const KEY = 'nexus_visited';

    if (localStorage.getItem(KEY)) return;

    // Small console hint for developers
    console.log(
      '%cNexus',
      'color:#22d3ee; font-weight:bold; font-size:14px;',
      '— Welcome. Click Get Started to configure your workspace.'
    );

    try {
      localStorage.setItem(KEY, '1');
    } catch (e) { /* storage might be blocked */ }
  }


  /* ------------------------------------------------------------------------
     3. SMOOTH PAGE EXIT (fade-out before navigation)
     ------------------------------------------------------------------------ */
  function bindCtaTransition() {
    const cta = document.querySelector('.cta');
    if (!cta) return;

    cta.addEventListener('click', function (e) {
      const href = cta.getAttribute('href');
      if (!href || href === '#' || href.startsWith('http')) return;

      e.preventDefault();

      document.body.style.transition = 'opacity 0.35s ease';
      document.body.style.opacity = '0';

      setTimeout(() => {
        window.location.href = href;
      }, 320);
    });
  }


  /* ------------------------------------------------------------------------
     4. PARALLAX (subtle cursor movement on orbs)
     ------------------------------------------------------------------------ */
  function bindOrbParallax() {
    const orbs = document.querySelectorAll('.orb');
    if (!orbs.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = null;

    window.addEventListener('mousemove', (e) => {
      if (raf) return;

      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth  - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;

        orbs.forEach((orb, i) => {
          const depth = (i + 1) * 8;
          orb.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
        });

        raf = null;
      });
    });
  }


  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    spawnParticles();
    firstVisitHint();
    bindCtaTransition();
    bindOrbParallax();
  });

})();