/**
 * ============================================================================
 * MAJID UNIVERSAL FEEDBACK WIDGET
 * ============================================================================
 * Allows students to give ratings, report bugs, ask questions or suggest features.
 * Auto-injects modal & trigger button cleanly into any page.
 * ============================================================================
 */

(function () {
  'use strict';

  // Inject stylesheet if not already present
  if (!document.getElementById('majid-feedback-css')) {
    const link = document.createElement('link');
    link.id = 'majid-feedback-css';
    link.rel = 'stylesheet';
    link.href = 'feedback.css';
    document.head.appendChild(link);
  }

  function initFeedbackWidget() {
    if (document.getElementById('majidFeedbackTrigger')) return;

    // 1. Create floating trigger
    const trigger = document.createElement('button');
    trigger.id = 'majidFeedbackTrigger';
    trigger.type = 'button';
    trigger.className = 'majid-feedback-trigger';
    trigger.setAttribute('aria-label', 'Share feedback or report an issue');
    trigger.innerHTML = `
      <span class="majid-feedback-badge-dot"></span>
      <span>💬 Feedback</span>
    `;
    document.body.appendChild(trigger);

    // 2. Create Modal HTML
    const backdrop = document.createElement('div');
    backdrop.id = 'majidFeedbackBackdrop';
    backdrop.className = 'majid-feedback-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'majidFbTitle');

    // Get current user if logged in
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('nexus_user') || 'null');
    } catch (e) {}

    backdrop.innerHTML = `
      <div class="majid-feedback-modal">
        <div class="majid-fb-header">
          <h3 class="majid-fb-title" id="majidFbTitle">
            <span>✨</span> Student Feedback & Support
          </h3>
          <button type="button" class="majid-fb-close" id="majidFbClose" aria-label="Close feedback modal">&times;</button>
        </div>

        <form id="majidFeedbackForm">
          <div class="majid-fb-group">
            <label class="majid-fb-label">Feedback Type</label>
            <div class="majid-fb-categories">
              <button type="button" class="majid-fb-cat-btn active" data-cat="rating">⭐ Rating</button>
              <button type="button" class="majid-fb-cat-btn" data-cat="feature">💡 Suggestion</button>
              <button type="button" class="majid-fb-cat-btn" data-cat="bug">🐞 Bug Report</button>
              <button type="button" class="majid-fb-cat-btn" data-cat="question">❓ Question</button>
            </div>
            <input type="hidden" id="majidFbCategory" value="rating">
          </div>

          <div class="majid-fb-group" id="majidFbRatingGroup">
            <label class="majid-fb-label">Experience Rating</label>
            <div class="majid-fb-rating" id="majidFbRatingWrap">
              <span class="majid-fb-star active" data-val="1">★</span>
              <span class="majid-fb-star active" data-val="2">★</span>
              <span class="majid-fb-star active" data-val="3">★</span>
              <span class="majid-fb-star active" data-val="4">★</span>
              <span class="majid-fb-star active" data-val="5">★</span>
            </div>
            <input type="hidden" id="majidFbRating" value="5">
          </div>

          <div class="majid-fb-group">
            <label class="majid-fb-label" for="majidFbName">Your Name</label>
            <input type="text" id="majidFbName" class="majid-fb-input" placeholder="e.g. Rahul Sharma" value="${user?.name || ''}">
          </div>

          <div class="majid-fb-group">
            <label class="majid-fb-label" for="majidFbEmail">Email (Optional)</label>
            <input type="email" id="majidFbEmail" class="majid-fb-input" placeholder="you@example.com" value="${user?.email || ''}">
          </div>

          <div class="majid-fb-group">
            <label class="majid-fb-label" for="majidFbMessage">Your Feedback / Issue *</label>
            <textarea id="majidFbMessage" class="majid-fb-textarea" required placeholder="Tell us how we can make MAJID better for you..."></textarea>
          </div>

          <button type="submit" id="majidFbSubmitBtn" class="majid-fb-submit">
            <span>Send Feedback 🚀</span>
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    // Event Listeners
    const openModal = () => {
      backdrop.classList.add('active');
      document.getElementById('majidFbMessage').focus();
    };

    const closeModal = () => {
      backdrop.classList.remove('active');
    };

    trigger.addEventListener('click', openModal);
    document.getElementById('majidFbClose').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Category button toggles
    const catBtns = backdrop.querySelectorAll('.majid-fb-cat-btn');
    const catInput = document.getElementById('majidFbCategory');
    const ratingGroup = document.getElementById('majidFbRatingGroup');

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
    const stars = backdrop.querySelectorAll('.majid-fb-star');
    const ratingInput = document.getElementById('majidFbRating');
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
    const form = document.getElementById('majidFeedbackForm');
    const submitBtn = document.getElementById('majidFbSubmitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = document.getElementById('majidFbMessage').value.trim();
      if (!message) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Sending...</span>`;

      const payload = {
        name: document.getElementById('majidFbName').value.trim() || 'Anonymous Student',
        email: document.getElementById('majidFbEmail').value.trim(),
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
