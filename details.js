/**
 * ============================================================================
 * DETAILS.JS — Role-Adaptive Detail Collection (Backend Connected)
 * ============================================================================
 */

(function () {
  'use strict';

  const NEXT_PAGE = 'credentials.html';

  /* ------------------------------------------------------------------------
     ROLE TEMPLATES
     ------------------------------------------------------------------------ */
  const ROLE_TEMPLATES = {
    student: {
      icon: '🎓', label: 'Student',
      fields: [
        { id: 'class', type: 'select', label: 'Current Class', required: true,
          options: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'College Year 1', 'College Year 2', 'College Year 3', 'College Year 4', 'Post-Graduate'] },
        { id: 'board', type: 'select', label: 'Board / University', required: true,
          options: ['CBSE', 'ICSE / ISC', 'UP Board', 'Bihar Board', 'Maharashtra Board', 'Tamil Nadu Board', 'Other State Board', 'University', 'Other'] },
        { id: 'stream', type: 'select', label: 'Stream / Specialization', required: false,
          options: ['Science (PCM)', 'Science (PCB)', 'Commerce', 'Arts / Humanities', 'Computer Science', 'Engineering', 'Medical', 'Management', 'Other'] },
        { id: 'goal', type: 'text', label: 'Main Goal', required: false,
          placeholder: 'e.g. Crack JEE / Score 95% / Learn coding' },
      ],
    },
    employee: {
      icon: '💼', label: 'Employee',
      fields: [
        { id: 'company', type: 'text', label: 'Company Name', required: true, placeholder: 'e.g. Google, Infosys' },
        { id: 'jobTitle', type: 'text', label: 'Job Title', required: true, placeholder: 'e.g. Software Engineer' },
        { id: 'experience', type: 'select', label: 'Experience Level', required: true,
          options: ['Fresher (0-1 yrs)', 'Junior (1-3 yrs)', 'Mid (3-5 yrs)', 'Senior (5-10 yrs)', 'Lead / Manager (10+ yrs)'] },
        { id: 'workMode', type: 'select', label: 'Work Mode', required: false,
          options: ['On-site', 'Remote', 'Hybrid', 'Freelance'] },
      ],
    },
    trader: {
      icon: '📈', label: 'Trader',
      fields: [
        { id: 'marketType', type: 'select', label: 'Market Type', required: true,
          options: ['Indian Stocks (NSE/BSE)', 'US Stocks', 'Forex', 'Crypto', 'Commodities', 'Options & Futures', 'Multiple Markets'] },
        { id: 'experience', type: 'select', label: 'Trading Experience', required: true,
          options: ['Beginner (< 1 yr)', 'Intermediate (1-3 yrs)', 'Advanced (3-5 yrs)', 'Pro (5+ yrs)'] },
        { id: 'capitalRange', type: 'select', label: 'Capital Range', required: false,
          options: ['Under ₹50K', '₹50K - ₹2L', '₹2L - ₹10L', '₹10L - ₹50L', '₹50L+'] },
        { id: 'style', type: 'select', label: 'Trading Style', required: false,
          options: ['Day Trading', 'Swing Trading', 'Positional', 'Scalping', 'Long-term Investing'] },
      ],
    },
    creator: {
      icon: '🎨', label: 'Creator',
      fields: [
        { id: 'primaryPlatform', type: 'select', label: 'Primary Platform', required: true,
          options: ['YouTube', 'Instagram', 'TikTok', 'Twitter / X', 'LinkedIn', 'Blog / Newsletter', 'Podcast', 'Twitch', 'Multiple'] },
        { id: 'niche', type: 'text', label: 'Your Niche', required: true, placeholder: 'e.g. Tech, Fitness, Fashion' },
        { id: 'followers', type: 'select', label: 'Audience Size', required: false,
          options: ['Just starting', 'Under 1K', '1K - 10K', '10K - 100K', '100K - 1M', '1M+'] },
        { id: 'contentType', type: 'select', label: 'Content Type', required: false,
          options: ['Video', 'Photo', 'Written', 'Audio', 'Design', 'Mixed'] },
      ],
    },
    developer: {
      icon: '💻', label: 'Developer',
      fields: [
        { id: 'primaryStack', type: 'select', label: 'Primary Stack', required: true,
          options: ['Frontend (React/Vue)', 'Backend (Node/Python)', 'Full Stack (MERN)', 'Mobile (React Native/Flutter)', 'DevOps / Cloud', 'AI / ML', 'Game Dev', 'Other'] },
        { id: 'experience', type: 'select', label: 'Experience Level', required: true,
          options: ['Beginner', 'Junior', 'Mid-level', 'Senior', 'Lead / Architect'] },
        { id: 'languages', type: 'text', label: 'Languages / Frameworks', required: false, placeholder: 'e.g. JavaScript, Python' },
        { id: 'github', type: 'text', label: 'GitHub / Portfolio URL', required: false, placeholder: 'https://github.com/username' },
      ],
    },
    freelancer: {
      icon: '🧑‍💻', label: 'Freelancer',
      fields: [
        { id: 'skills', type: 'text', label: 'Main Skills', required: true, placeholder: 'e.g. Design, Writing, Web Dev' },
        { id: 'platforms', type: 'select', label: 'Primary Platform', required: false,
          options: ['Upwork', 'Fiverr', 'Freelancer.com', 'Direct Clients', 'Multiple Platforms', 'Just starting'] },
        { id: 'experience', type: 'select', label: 'Freelancing Experience', required: true,
          options: ['Beginner (< 1 yr)', 'Intermediate (1-3 yrs)', 'Experienced (3-5 yrs)', 'Pro (5+ yrs)'] },
        { id: 'rate', type: 'select', label: 'Hourly Rate Range', required: false,
          options: ['₹500/hr or less', '₹500 - ₹2000/hr', '₹2000 - ₹5000/hr', '₹5000+/hr', 'Prefer not to say'] },
      ],
    },
    teacher: {
      icon: '📚', label: 'Teacher',
      fields: [
        { id: 'subject', type: 'text', label: 'Subject(s) You Teach', required: true, placeholder: 'e.g. Mathematics, Physics' },
        { id: 'institute', type: 'text', label: 'School / Institute', required: false, placeholder: 'e.g. Delhi Public School' },
        { id: 'levels', type: 'select', label: 'Levels Taught', required: true,
          options: ['Primary (1-5)', 'Middle (6-8)', 'Secondary (9-10)', 'Senior (11-12)', 'College / University', 'Competitive Exam Coaching', 'Mixed'] },
        { id: 'experience', type: 'select', label: 'Teaching Experience', required: false,
          options: ['< 1 yr', '1-3 yrs', '3-5 yrs', '5-10 yrs', '10+ yrs'] },
      ],
    },
    doctor: {
      icon: '🩺', label: 'Doctor',
      fields: [
        { id: 'specialization', type: 'text', label: 'Specialization', required: true, placeholder: 'e.g. Cardiology, Dermatology' },
        { id: 'hospital', type: 'text', label: 'Hospital / Clinic', required: false, placeholder: 'e.g. Apollo, Fortis' },
        { id: 'experience', type: 'select', label: 'Experience', required: true,
          options: ['Resident', 'Junior (< 3 yrs)', 'Mid (3-8 yrs)', 'Senior (8-15 yrs)', 'Consultant (15+ yrs)'] },
        { id: 'mode', type: 'select', label: 'Practice Mode', required: false,
          options: ['Hospital', 'Private Clinic', 'Both', 'Teleconsultation', 'Academic / Research'] },
      ],
    },
    other: {
      icon: '✨', label: 'Custom Role',
      fields: [
        { id: 'professionName', type: 'text', label: 'What do you do?', required: true, placeholder: 'e.g. Photographer, Lawyer, Chef' },
        { id: 'primaryGoal', type: 'text', label: 'What do you want to achieve?', required: false, placeholder: 'e.g. Track clients, organize projects' },
        { id: 'experience', type: 'select', label: 'Experience Level', required: false,
          options: ['Beginner', 'Intermediate', 'Experienced', 'Expert'] },
      ],
    },
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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

  /* ------------------------------------------------------------------------
     RENDER FIELD
     ------------------------------------------------------------------------ */
  function renderField(field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-5';

    const label = document.createElement('label');
    label.className = 'block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2';
    label.textContent = field.label;
    if (field.required) {
      const star = document.createElement('span');
      star.textContent = ' *';
      star.className = 'text-cyan-400';
      label.appendChild(star);
    }
    wrapper.appendChild(label);

    let input;
    const baseClass = `w-full px-4 py-3 rounded-xl bg-ink-900/60 border border-white/10 text-white text-sm placeholder-slate-600
                       focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all`;

    if (field.type === 'select') {
      input = document.createElement('select');
      input.className = baseClass + ' custom-select pr-10 cursor-pointer';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '— Select —';
      placeholder.disabled = true;
      placeholder.selected = true;
      input.appendChild(placeholder);
      field.options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        input.appendChild(o);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type || 'text';
      input.className = baseClass;
      if (field.placeholder) input.placeholder = field.placeholder;
    }

    input.id = 'field_' + field.id;
    input.name = field.id;
    if (field.required) input.required = true;

    wrapper.appendChild(input);
    return wrapper;
  }

  /* ------------------------------------------------------------------------
     BUILD FORM
     ------------------------------------------------------------------------ */
  function buildFormForRole(role) {
    const template = ROLE_TEMPLATES[role] || ROLE_TEMPLATES.other;
    const roleIcon = $('roleIcon');
    const roleLabel = $('roleLabel');
    if (roleIcon) roleIcon.textContent = template.icon;
    if (roleLabel) roleLabel.textContent = template.label;

    const dynamicFields = $('dynamicFields');
    if (!dynamicFields) return;
    dynamicFields.innerHTML = '';
    template.fields.forEach((field) => {
      dynamicFields.appendChild(renderField(field));
    });
  }

  /* ------------------------------------------------------------------------
     VALIDATE
     ------------------------------------------------------------------------ */
  function isFormValid() {
    const requiredFields = document.querySelectorAll('#dynamicFields [required]');
    for (const f of requiredFields) {
      if (!f.value || !f.value.trim()) return false;
    }
    return true;
  }

  function collectData() {
    const data = {};
    const inputs = document.querySelectorAll('#dynamicFields input, #dynamicFields select');
    inputs.forEach((inp) => {
      if (inp.name) data[inp.name] = inp.value.trim();
    });
    return data;
  }

  /* ------------------------------------------------------------------------
     SUBMIT — Backend Call
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    // Auth guard
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    // Fetch fresh user data
    API.auth.me().catch(() => {
      API.Token.remove();
      window.location.href = 'auth.html';
    });

    // Role from localStorage (set during profession step)
    const role = localStorage.getItem('nexus_user_role') || 'student';
    buildFormForRole(role);

    // Handle form submit
    const form = $('detailsForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!isFormValid()) {
          showToast('Please fill all required fields', 'error');
          return;
        }

        const continueBtn = $('continueBtn');
        const continueText = $('continueText');
        const roleData = collectData();

        continueBtn.disabled = true;
        continueText.textContent = 'Saving…';

        try {
          await API.auth.updateDetails(roleData);
          continueText.textContent = 'Saved ✓';
          showToast('Details saved ✓', 'success');

          setTimeout(() => {
            document.body.style.transition = 'opacity 0.35s ease';
            document.body.style.opacity = '0';
            setTimeout(() => { window.location.href = NEXT_PAGE; }, 320);
          }, 500);
        } catch (err) {
          console.error(err);
          continueBtn.disabled = false;
          continueText.textContent = 'Continue';
          showToast(err.message || 'Save failed', 'error');
        }
      });
    }

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