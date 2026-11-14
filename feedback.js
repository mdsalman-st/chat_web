/**
 * ============================================================================
 * NEXUS UNIVERSAL FEEDBACK WIDGET
 * ============================================================================
 * Allows students to give ratings, report bugs, ask questions or suggest features.
 * Auto-injects modal & trigger button cleanly into any page.
 * ============================================================================
 */

(function () {
  'use strict';

  // Inject stylesheet if not already present
  if (!document.getElementById('nexus-feedback-css')) {
    const link = document.createElement('link');
    link.id = 'nexus-feedback-css';
    link.rel = 'stylesheet';
    link.href = 'feedback.css';
    document.head.appendChild(link);
  }

  function initFeedbackWidget() {
    if (document.getElementById('nexusFeedbackTrigger')) return;

    // 1. Create floating trigger
    const trigger = document.createElement('button');
    trigger.id = 'nexusFeedbackTrigger';
    trigger.type = 'button';
    trigger.className = 'nexus-feedback-trigger';
    trigger.setAttribute('aria-label', 'Share feedback or report an issue');
    trigger.innerHTML = `
      <span class="nexus-feedback-badge-dot"></span>
      <span>💬 Feedback</span>
    `;
    document.body.appendChild(trigger);

    // 2. Create Modal HTML
    const backdrop = document.createElement('div');
    backdrop.id = 'nexusFeedbackBackdrop';
    backdrop.className = 'nexus-feedback-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'nexusFbTitle');

    // Get current user if logged in
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('nexus_user') || 'null');
    } catch (e) {}

    backdrop.innerHTML = `
      <div class="nexus-feedback-modal">
        <div class="nexus-fb-header">
          <h3 class="nexus-fb-title" id="nexusFbTitle">
            <span>✨</span> Student Feedback & Support
          </h3>
          <button type="button" class="nexus-fb-close" id="nexusFbClose" aria-label="Close feedback modal">&times;</button>
        </div>

        <form id="nexusFeedbackForm">
          <div class="nexus-fb-group">
            <label class="nexus-fb-label">Feedback Type</label>
            <div class="nexus-fb-categories">
              <button type="button" class="nexus-fb-cat-btn active" data-cat="rating">⭐ Rating</button>
              <button type="button" class="nexus-fb-cat-btn" data-cat="feature">💡 Suggestion</button>
              <button type="button" class="nexus-fb-cat-btn" data-cat="bug">🐞 Bug Report</button>
              <button type="button" class="nexus-fb-cat-btn" data-cat="question">❓ Question</button>
            </div>
            <input type="hidden" id="nexusFbCategory" value="rating">
          </div>

          <div class="nexus-fb-group" id="nexusFbRatingGroup">
            <label class="nexus-fb-label">Experience Rating</label>
            <div class="nexus-fb-rating" id="nexusFbRatingWrap">
              <span class="nexus-fb-star active" data-val="1">★</span>
              <span class="nexus-fb-star active" data-val="2">★</span>
              <span class="nexus-fb-star active" data-val="3">★</span>
              <span class="nexus-fb-star active" data-val="4">★</span>
              <span class="nexus-fb-star active" data-val="5">★</span>
            </div>
            <input type="hidden" id="nexusFbRating" value="5">
          </div>

          <div class="nexus-fb-group">
            <label class="nexus-fb-label" for="nexusFbName">Your Name</label>
            <input type="text" id="nexusFbName" class="nexus-fb-input" placeholder="e.g. Rahul Sharma" value="${user?.name || ''}">
          </div>

          <div class="nexus-fb-group">
            <label class="nexus-fb-label" for="nexusFbEmail">Email (Optional)</label>
            <input type="email" id="nexusFbEmail" class="nexus-fb-input" placeholder="you@example.com" value="${user?.email || ''}">
          </div>

          <div class="nexus-fb-group">
            <label class="nexus-fb-label" for="nexusFbMessage">Your Feedback / Issue *</label>
            <textarea id="nexusFbMessage" class="nexus-fb-textarea" required placeholder="Tell us how we can make Nexus better for you..."></textarea>
          </div>

          <button type="submit" id="nexusFbSubmitBtn" class="nexus-fb-submit">
            <span>Send Feedback 🚀</span>
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    // Event Listeners
    const openModal = () => {
      backdrop.classList.add('active');
      document.getElementById('nexusFbMessage').focus();
    };

    const closeModal = () => {
      backdrop.classList.remove('active');
    };

    trigger.addEventListener('click', openModal);
    document.getElementById('nexusFbClose').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Category button toggles
    const catBtns = backdrop.querySelectorAll('.nexus-fb-cat-btn');
    const catInput = document.getElementById('nexusFbCategory');
    const ratingGroup = document.getElementById('nexusFbRatingGroup');

    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.cat;
        catInput.value = cat;
        if (cat === 'rating') {
          ratingGroup.style.display = 'block';
        } else {
          ratingGroup.style.display = 'none';
        }
      });
    });

    // Star rating
    const stars = backdrop.querySelectorAll('.nexus-fb-star');
    const ratingInput = document.getElementById('nexusFbRating');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.dataset.val, 10);
        ratingInput.value = val;
        stars.forEach((s, idx) => {
          s.classList.toggle('active', idx < val);
        });
      });
    });

    // Form submission
    const form = document.getElementById('nexusFeedbackForm');
    const submitBtn = document.getElementById('nexusFbSubmitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = document.getElementById('nexusFbMessage').value.trim();
      if (!message) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Sending...</span>`;

      const payload = {
        name: document.getElementById('nexusFbName').value.trim() || 'Anonymous Student',
        email: document.getElementById('nexusFbEmail').value.trim(),
        category: catInput.value,
        rating: parseInt(ratingInput.value, 10) || 5,
        message: message,
        pageUrl: window.location.href,
        userId: user?._id || user?.id || null
      };

      try {
        if (window.API && window.API.feedback && typeof window.API.feedback.submit === 'function') {
          await window.API.feedback.submit(payload);
        } else {
          // Direct fetch fallback
          await fetch('https://chat-web-backend-1-8wgm.onrender.com/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        submitBtn.innerHTML = `<span>Success! Thank you ✓</span>`;
        submitBtn.style.background = '#059669';

        setTimeout(() => {
          closeModal();
          form.reset();
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Send Feedback 🚀</span>`;
          submitBtn.style.background = '';
        }, 1500);

      } catch (err) {
        console.warn('Feedback submit fallback:', err);
        // Save locally if offline
        try {
          const list = JSON.parse(localStorage.getItem('nexus_offline_feedback') || '[]');
          list.push({ ...payload, date: new Date().toISOString() });
          localStorage.setItem('nexus_offline_feedback', JSON.stringify(list));
        } catch (e) {}

        submitBtn.innerHTML = `<span>Saved Locally ✓</span>`;
        setTimeout(() => {
          closeModal();
          form.reset();
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Send Feedback 🚀</span>`;
        }, 1500);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeedbackWidget);
  } else {
    initFeedbackWidget();
  }
})();
