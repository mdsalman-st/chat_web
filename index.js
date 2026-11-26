/**
 * ============================================================================
 * MAJID — Welcome Page Script
 * ============================================================================
 * Handles:
 * 1. Floating particle generation (optimized for device capabilities)
 * 2. Welcome toast on first visit
 * 3. Smooth internal navigation
 * 4. Parallax effect (desktop only)
 * 5. Touch/device optimizations
 * 6. Performance monitoring
 * ============================================================================
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     DEVICE CAPABILITIES DETECTION
     ------------------------------------------------------------------------ */
  const DeviceCapabilities = {
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    isLowEnd: navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    supportsIntersectionObserver: 'IntersectionObserver' in window,
    supportsRequestIdleCallback: 'requestIdleCallback' in window,
    devicePixelRatio: window.devicePixelRatio || 1,
    
    // Calculate optimal particle count based on device
    getOptimalParticleCount() {
      if (this.prefersReducedMotion) return 0;
      if (this.isLowEnd || this.isMobile) return 12;
      if (this.isTablet) return 18;
      return 25;
    },
    
    // Check if heavy animations should run
    shouldRunHeavyAnimations() {
      return !this.prefersReducedMotion && !this.isLowEnd;
    }
  };

  /* ------------------------------------------------------------------------
     1. PARTICLE GENERATOR (Optimized)
     ------------------------------------------------------------------------ */
  function spawnParticles() {
    const wrap = document.getElementById('particles');
    if (!wrap) return;

    const COUNT = DeviceCapabilities.getOptimalParticleCount();
    if (COUNT === 0) return;

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement('span');
      p.className = 'particle';

      p.style.left = Math.random() * 100 + '%';
      p.style.top = (100 + Math.random() * 20) + '%';
      
      // Slower animations on mobile for performance
      const durationBase = DeviceCapabilities.isMobile ? 20 : 14;
      const durationRange = DeviceCapabilities.isMobile ? 20 : 16;
      p.style.animationDuration = (durationBase + Math.random() * durationRange) + 's';
      p.style.animationDelay = (-Math.random() * 30) + 's';

      const size = 1 + Math.random() * (DeviceCapabilities.isMobile ? 1.5 : 2);
      p.style.width = size + 'px';
      p.style.height = size + 'px';

      fragment.appendChild(p);
    }
    
    wrap.appendChild(fragment);
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

    const handleClick = function (e) {
      const href = cta.getAttribute('href');
      if (!href || href === '#' || href.startsWith('http')) return;

      e.preventDefault();

      // Check if already transitioning
      if (document.body.classList.contains('page-exiting')) return;
      document.body.classList.add('page-exiting');

      document.body.style.transition = 'opacity 0.35s ease';
      document.body.style.opacity = '0';

      setTimeout(() => {
        window.location.href = href;
      }, 320);
    };

    // Support both click and touch for better mobile response
    cta.addEventListener('click', handleClick);
    
    // Add touchstart for immediate feedback on mobile
    if (DeviceCapabilities.isTouch) {
      cta.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.98)';
      }, { passive: true });
      
      cta.addEventListener('touchend', function() {
        this.style.transform = '';
      }, { passive: true });
    }
  }


  /* ------------------------------------------------------------------------
     4. PARALLAX (subtle cursor movement on orbs) - Desktop only
     ------------------------------------------------------------------------ */
  function bindOrbParallax() {
    const orbs = document.querySelectorAll('.orb');
    if (!orbs.length) return;
    if (DeviceCapabilities.prefersReducedMotion) return;
    if (DeviceCapabilities.isTouch) return; // Disable on touch devices
    if (DeviceCapabilities.isLowEnd) return; // Disable on low-end devices

    let raf = null;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
      
      if (raf) return;

      raf = requestAnimationFrame(() => {
        const x = (lastX / window.innerWidth - 0.5) * 2;
        const y = (lastY / window.innerHeight - 0.5) * 2;

        orbs.forEach((orb, i) => {
          const depth = (i + 1) * 8;
          orb.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
        });

        raf = null;
      });
    };

    // Use passive listener for better scroll performance
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Cleanup on page hide
    window.addEventListener('pagehide', () => {
      window.removeEventListener('mousemove', handleMouseMove);
    }, { once: true });
  }


  /* ------------------------------------------------------------------------
     5. PERFORMANCE MONITORING
     ------------------------------------------------------------------------ */
  function initPerformanceMonitoring() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn('[MAJID] Long task detected:', entry.duration.toFixed(2) + 'ms');
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task API not supported
      }
    }

    // Log device info in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('[MAJID] Device Capabilities:', {
        isMobile: DeviceCapabilities.isMobile,
        isTablet: DeviceCapabilities.isTablet,
        isTouch: DeviceCapabilities.isTouch,
        isLowEnd: DeviceCapabilities.isLowEnd,
        prefersReducedMotion: DeviceCapabilities.prefersReducedMotion,
        devicePixelRatio: DeviceCapabilities.devicePixelRatio,
        hardwareConcurrency: navigator.hardwareConcurrency,
        particleCount: DeviceCapabilities.getOptimalParticleCount()
      });
    }
  }


  /* ------------------------------------------------------------------------
     6. VIEWPORT HEIGHT FIX FOR MOBILE BROWSERS
     ------------------------------------------------------------------------ */
  function fixViewportHeight() {
    // Set CSS custom property for dynamic viewport height
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH, { passive: true });
    window.addEventListener('orientationchange', setVH, { passive: true });
  }


  /* ------------------------------------------------------------------------
     7. TOUCH GESTURE SUPPORT (for future swipe navigation)
     ------------------------------------------------------------------------ */
  function initTouchGestures() {
    if (!DeviceCapabilities.isTouch) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      if (!touchStartX || !touchStartY) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const diffX = touchStartX - touchEndX;
      const diffY = touchStartY - touchEndY;
      
      // Minimum swipe distance
      if (Math.abs(diffX) > 50 || Math.abs(diffY) > 50) {
        // Swipe detected - can be used for navigation in future
        const direction = Math.abs(diffX) > Math.abs(diffY) 
          ? (diffX > 0 ? 'left' : 'right')
          : (diffY > 0 ? 'up' : 'down');
        
        // Dispatch custom event for other scripts to use
        document.dispatchEvent(new CustomEvent('majid:swipe', { 
          detail: { direction, diffX, diffY } 
        }));
      }
      
      touchStartX = 0;
      touchStartY = 0;
    }, { passive: true });
  }


  /* ------------------------------------------------------------------------
     8. INTERSECTION OBSERVER FOR LAZY ANIMATIONS
     ------------------------------------------------------------------------ */
  function initLazyAnimations() {
    if (!DeviceCapabilities.supportsIntersectionObserver) return;
    if (DeviceCapabilities.prefersReducedMotion) return;

    const animatedElements = document.querySelectorAll('.anim');
    if (!animatedElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1
    });

    animatedElements.forEach((el) => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }


  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  function init() {
    // Critical: Fix viewport height first
    fixViewportHeight();
    
    // Initialize performance monitoring
    initPerformanceMonitoring();
    
    // Initialize touch gestures
    initTouchGestures();
    
    // Initialize lazy animations
    initLazyAnimations();
    
    // Spawn particles (use requestIdleCallback if available for non-blocking)
    if (DeviceCapabilities.supportsRequestIdleCallback) {
      requestIdleCallback(spawnParticles, { timeout: 1000 });
    } else {
      // Fallback with setTimeout
      setTimeout(spawnParticles, 100);
    }
    
    firstVisitHint();
    bindCtaTransition();
    bindOrbParallax();
  }

  // Use DOMContentLoaded for initial setup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle page visibility changes for performance
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page is hidden - pause animations
      document.body.classList.add('page-hidden');
    } else {
      // Page is visible - resume animations
      document.body.classList.remove('page-hidden');
    }
  });

})();