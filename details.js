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
     STUDENT DYNAMIC FORM BUILDER
     ------------------------------------------------------------------------ */
  async function buildStudentDynamicForm() {
    const dynamicFields = $('dynamicFields');
    if (!dynamicFields) return;
    dynamicFields.innerHTML = `
      <div class="flex items-center justify-center py-8">
        <div class="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span class="ml-3 text-xs text-slate-400">Loading curriculum & boards…</span>
      </div>
    `;

    try {
      const res = await API.tests.getBoards();
      const boards = res.boards || [];

      dynamicFields.innerHTML = '';

      // 1) Board selector
      const boardWrap = document.createElement('div');
      boardWrap.className = 'mb-4';
      boardWrap.innerHTML = `
        <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">
          Board / University <span class="text-cyan-400">*</span>
        </label>
        <select id="student_board" class="w-full px-4 py-3 rounded-xl bg-ink-900/60 border border-white/10 text-white text-sm custom-select pr-10 cursor-pointer focus:outline-none focus:border-cyan-400 transition-all">
          ${boards.map(b => `<option value="${b.code}" ${b.code === 'bseb' ? 'selected' : ''}>${b.name}</option>`).join('')}
        </select>
        <p class="text-[11px] text-slate-500 mt-1">Syllabus &amp; paper pattern will adapt to this board.</p>
      `;
      dynamicFields.appendChild(boardWrap);

      // 1.1) Other Board Name (Conditional)
      const otherWrap = document.createElement('div');
      otherWrap.id = 'other_board_wrap';
      otherWrap.className = 'mb-4 hidden';
      otherWrap.innerHTML = `
        <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300 mb-2">
          Enter Your Board / University Name <span class="text-cyan-400">*</span>
        </label>
        <input type="text" id="student_other_board" placeholder="e.g. Maharashtra State Board, RBSE, etc."
               class="w-full px-4 py-3 rounded-xl bg-ink-900/60 border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-400 transition-all">
        <p class="text-[11px] text-slate-500 mt-1">We will apply the standard NCERT pattern while tracking demand for your board.</p>
      `;
      dynamicFields.appendChild(otherWrap);

      // 2) Class selector
      const classWrap = document.createElement('div');
      classWrap.className = 'mb-4';
      classWrap.innerHTML = `
        <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">
          Current Class <span class="text-cyan-400">*</span>
        </label>
        <select id="student_class" class="w-full px-4 py-3 rounded-xl bg-ink-900/60 border border-white/10 text-white text-sm custom-select pr-10 cursor-pointer focus:outline-none focus:border-cyan-400 transition-all">
          <option value="10" selected>Class 10 (Matric / Secondary)</option>
          <option value="12">Class 12 (Intermediate / Senior Secondary)</option>
          <option value="9">Class 9</option>
          <option value="11">Class 11</option>
        </select>
      `;
      dynamicFields.appendChild(classWrap);

      // 3) Stream selector (for Class 11-12)
      const streamWrap = document.createElement('div');
      streamWrap.id = 'student_stream_wrap';
      streamWrap.className = 'mb-4 hidden';
      streamWrap.innerHTML = `
        <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">
          Stream / Specialization <span class="text-cyan-400">*</span>
        </label>
        <select id="student_stream" class="w-full px-4 py-3 rounded-xl bg-ink-900/60 border border-white/10 text-white text-sm custom-select pr-10 cursor-pointer focus:outline-none focus:border-cyan-400 transition-all">
          <option value="science_pcm" selected>Science (PCM) — Physics, Chemistry, Maths</option>
          <option value="science_pcb">Science (PCB) — Physics, Chemistry, Biology</option>
          <option value="commerce">Commerce — Accounts, Business, Eco</option>
          <option value="arts">Arts / Humanities — History, Pol Science, Geo</option>
        </select>
      `;
      dynamicFields.appendChild(streamWrap);

      // 4) Medium selector
      const mediumWrap = document.createElement('div');
      mediumWrap.className = 'mb-4';
      mediumWrap.innerHTML = `
        <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">
          Exam Medium / Language <span class="text-cyan-400">*</span>
        </label>
        <div class="grid grid-cols-2 gap-3" id="mediumOptionGrid">
          <label class="flex items-center gap-3 p-3 rounded-xl bg-ink-900/60 border border-cyan-500/40 cursor-pointer text-sm font-semibold text-white">
            <input type="radio" name="student_medium" value="Hindi" checked class="text-cyan-400 focus:ring-0">
            <span>🇮🇳 Hindi (हिन्दी)</span>
          </label>
          <label class="flex items-center gap-3 p-3 rounded-xl bg-ink-900/60 border border-white/10 hover:border-white/20 cursor-pointer text-sm font-semibold text-white">
            <input type="radio" name="student_medium" value="English" class="text-cyan-400 focus:ring-0">
            <span>🇬🇧 English</span>
          </label>
        </div>
      `;
      dynamicFields.appendChild(mediumWrap);

      // 5) Dynamic Subjects Multi-select Checklist
      const subjectsWrap = document.createElement('div');
      subjectsWrap.className = 'mb-4';
      subjectsWrap.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            Your Subjects <span class="text-cyan-400">*</span>
          </label>
          <span class="text-[10px] text-cyan-400 font-semibold" id="subjectCounter">Tick all that apply</span>
        </div>
        <div id="subjectCheckboxes" class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1"></div>
      `;
      dynamicFields.appendChild(subjectsWrap);

      // 6) Target Goal
      const goalWrap = document.createElement('div');
      goalWrap.className = 'mb-5';
      goalWrap.innerHTML = `
        <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">
          Target Goal (Optional)
        </label>
        <input type="text" id="student_goal" placeholder="e.g. Score 90%+ in Board Exams / Top State Rank"
               class="w-full px-4 py-3 rounded-xl bg-ink-900/60 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-all">
      `;
      dynamicFields.appendChild(goalWrap);

      // Reactive logic for subjects & streams
      const boardSelect = $('student_board');
      const otherBoardWrap = $('other_board_wrap');
      const otherBoardInput = $('student_other_board');
      const classSelect = $('student_class');
      const streamSelectWrap = $('student_stream_wrap');
      const streamSelect = $('student_stream');
      const subjectBox = $('subjectCheckboxes');

      async function refreshSubjects() {
        const bCode = boardSelect.value;
        const cVal = classSelect.value;
        const isSenior = cVal === '11' || cVal === '12';

        if (isSenior) {
          streamSelectWrap.classList.remove('hidden');
        } else {
          streamSelectWrap.classList.add('hidden');
        }

        const streamVal = isSenior ? streamSelect.value : null;

        subjectBox.innerHTML = `
          <div class="col-span-2 py-3 text-center text-xs text-slate-400">Loading subjects…</div>
        `;

        try {
          const subRes = await API.tests.getSubjects(bCode, cVal, streamVal);
          const subjects = subRes.subjects || [];

          if (subjects.length === 0) {
            subjectBox.innerHTML = `<div class="col-span-2 text-xs text-slate-500 py-2">No subjects found.</div>`;
            return;
          }

          subjectBox.innerHTML = subjects.map((sub) => `
            <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 cursor-pointer transition text-xs font-medium text-slate-200">
              <input type="checkbox" name="subject_chk" value="${esc(sub.code)}"
                     data-name="${esc(sub.name)}" data-hindi="${esc(sub.hindiName || '')}" data-icon="${esc(sub.icon || '📚')}"
                     checked class="w-4 h-4 rounded bg-ink-950 border-white/20 text-cyan-500 focus:ring-0">
              <span class="text-base leading-none">${sub.icon || '📚'}</span>
              <span class="truncate">${esc(sub.name)}</span>
            </label>
          `).join('');

          // Highlight checked cards
          subjectBox.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', () => {
              const card = chk.closest('label');
              if (card) {
                card.classList.toggle('border-cyan-500/50', chk.checked);
                card.classList.toggle('bg-cyan-500/[0.08]', chk.checked);
              }
            });
            // initial check styling
            if (chk.checked) {
              const card = chk.closest('label');
              card?.classList.add('border-cyan-500/50', 'bg-cyan-500/[0.08]');
            }
          });
        } catch (e) {
          subjectBox.innerHTML = `<div class="col-span-2 text-xs text-red-400 py-2">Failed to load subjects.</div>`;
        }
      }

      boardSelect.addEventListener('change', () => {
        const isOther = boardSelect.value === 'other';
        otherBoardWrap.classList.toggle('hidden', !isOther);
        if (isOther && otherBoardInput) otherBoardInput.focus();
        refreshSubjects();
      });

      classSelect.addEventListener('change', refreshSubjects);
      streamSelect.addEventListener('change', refreshSubjects);

      // Medium radio styles
      document.querySelectorAll('input[name="student_medium"]').forEach(r => {
        r.addEventListener('change', () => {
          document.querySelectorAll('#mediumOptionGrid label').forEach(lbl => {
            const hasChecked = lbl.querySelector('input:checked');
            lbl.classList.toggle('border-cyan-500/40', !!hasChecked);
            lbl.classList.toggle('border-white/10', !hasChecked);
          });
        });
      });

      // Initial load
      refreshSubjects();

    } catch (err) {
      console.error('buildStudentDynamicForm error:', err);
      // Fallback to static fields
      const template = ROLE_TEMPLATES.student;
      dynamicFields.innerHTML = '';
      template.fields.forEach((field) => {
        dynamicFields.appendChild(renderField(field));
      });
    }
  }

  /* ------------------------------------------------------------------------
     BUILD FORM
     ------------------------------------------------------------------------ */
  function buildFormForRole(role) {
    const roleIcon = $('roleIcon');
    const roleLabel = $('roleLabel');

    if (role === 'student') {
      if (roleIcon) roleIcon.textContent = '🎓';
      if (roleLabel) roleLabel.textContent = 'Student';
      buildStudentDynamicForm();
      return;
    }

    const template = ROLE_TEMPLATES[role] || ROLE_TEMPLATES.other;
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

        const continueBtn = $('continueBtn');
        const continueText = $('continueText');

        if (role === 'student') {
          const boardSelect = $('student_board');
          const classSelect = $('student_class');
          const otherInput = $('student_other_board');
          const streamSelect = $('student_stream');
          const mediumChecked = document.querySelector('input[name="student_medium"]:checked');
          const goalInput = $('student_goal');

          const board = boardSelect ? boardSelect.value : 'bseb';
          const isOther = board === 'other';
          const otherBoardName = isOther && otherInput ? otherInput.value.trim() : '';

          if (isOther && (!otherBoardName || otherBoardName.length < 2)) {
            showToast('Please enter your Board / University name', 'error');
            otherInput?.focus();
            return;
          }

          const classLevel = classSelect ? classSelect.value : '10';
          const isSenior = classLevel === '11' || classLevel === '12';
          const stream = isSenior && streamSelect ? streamSelect.value : null;
          const streamName = isSenior && streamSelect ? streamSelect.options[streamSelect.selectedIndex]?.text : null;
          const medium = mediumChecked ? mediumChecked.value : 'Hindi';

          // Collect checked subjects
          const checkedSubjects = Array.from(document.querySelectorAll('input[name="subject_chk"]:checked')).map(chk => ({
            code: chk.value,
            name: chk.dataset.name || chk.value,
            hindiName: chk.dataset.hindi || '',
            icon: chk.dataset.icon || '📚',
          }));

          if (checkedSubjects.length === 0) {
            showToast('Please select at least one subject to continue', 'error');
            return;
          }

          continueBtn.disabled = true;
          continueText.textContent = 'Saving Curriculum…';

          try {
            const profilePayload = {
              board,
              otherBoardName,
              classLevel,
              stream,
              streamName,
              medium,
              selectedSubjects: checkedSubjects,
              targetGoal: goalInput ? goalInput.value.trim() : '',
            };

            await API.tests.updateProfile(profilePayload);
            continueText.textContent = 'Saved ✓';
            showToast('Curriculum profile saved ✓', 'success');

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
          return;
        }

        // For non-student roles
        if (!isFormValid()) {
          showToast('Please fill all required fields', 'error');
          return;
        }

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