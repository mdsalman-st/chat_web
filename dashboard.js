/* ============================================================================
   DASHBOARD.JS — Real User Data + Role-Adaptive Widgets
   ============================================================================ */

(function () {
  'use strict';

  const state = {
    role: 'student',
    user: {},
    username: '',
    secret: '',
    vaultOpen: false,
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- Toast ---------- */
  function toast(msg, type='info') {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position:'fixed', bottom:'24px', left:'50%',
      transform:'translateX(-50%) translateY(20px)',
      background: type==='error'?'#dc2626':type==='success'?'#059669':'#111827',
      color:'#fff', padding:'0.75rem 1.25rem', borderRadius:'12px',
      fontSize:'0.85rem', fontWeight:'600', zIndex:'9999',
      opacity:'0', transition:'opacity 0.3s, transform 0.3s',
      pointerEvents:'none', maxWidth:'90vw', textAlign:'center',
    });
    document.body.appendChild(t);
    requestAnimationFrame(()=>{ t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
    setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(20px)'; setTimeout(()=>t.remove(),350); }, 2400);
  }
  window.toast = toast;

  /* ---------- Role Config ---------- */
  const ROLE_CONFIG = {
    student: { icon:'🎓', greeting:"Let's get some studying done.",
      stats:[{label:'Study Streak',value:'12',suffix:'days'},{label:'Tests Taken',value:'48',suffix:'total'},{label:'Avg. Score',value:'87',suffix:'%'},{label:'Focus Hours',value:'26',suffix:'this wk'}],
      mainWidget:{title:"Today's Study Plan",items:[{icon:'📘',name:'Physics — Chapter 4',time:'45 min'},{icon:'📐',name:'Math — Trigonometry',time:'60 min'},{icon:'📝',name:'Mock Test — Chemistry',time:'90 min'}]},
      secondaryWidget:{title:'Recent Tests',rows:[{name:'Physics Mock',score:'85/100',status:'done'},{name:'Math Quiz',score:'92/100',status:'done'},{name:'Chemistry Mock',score:'—',status:'pending'}]},
      sideWidget:{title:'Streak Calendar',content:'🔥 12-day streak — keep it up!'} },

    employee: { icon:'💼', greeting:"Ready to crush the workday?",
      stats:[{label:'Tasks Done',value:'34',suffix:'today'},{label:'Meetings',value:'3',suffix:'upcoming'},{label:'Focus Time',value:'5.2',suffix:'hrs'},{label:'Pending',value:'7',suffix:'tasks'}],
      mainWidget:{title:"Today's Tasks",items:[{icon:'📊',name:'Q4 Report Draft',time:'Due 4 PM'},{icon:'💬',name:'Client Call — Acme Inc',time:'2:30 PM'},{icon:'🔍',name:'Review PR #241',time:'Anytime'}]},
      secondaryWidget:{title:'Recent Activity',rows:[{name:'Standup Meeting',score:'Done',status:'done'},{name:'Sprint Planning',score:'Tomorrow',status:'pending'},{name:'Code Review',score:'Done',status:'done'}]},
      sideWidget:{title:'Weekly Focus',content:'📈 26 hours logged this week'} },

    trader: { icon:'📈', greeting:"Markets are moving. Ready?",
      stats:[{label:'Portfolio',value:'+4.2',suffix:'%'},{label:'Open Trades',value:'6',suffix:'active'},{label:'Today P&L',value:'+₹2,340',suffix:'net'},{label:'Watchlist',value:'12',suffix:'stocks'}],
      mainWidget:{title:'Active Positions',items:[{icon:'🟢',name:'RELIANCE • Long',time:'+₹450'},{icon:'🔴',name:'TCS • Short',time:'-₹120'},{icon:'🟢',name:'HDFC Bank • Long',time:'+₹890'}]},
      secondaryWidget:{title:'Market Watch',rows:[{name:'NIFTY 50',score:'22,145',status:'done'},{name:'BANKNIFTY',score:'48,210',status:'done'},{name:'SENSEX',score:'72,880',status:'done'}]},
      sideWidget:{title:'Risk Meter',content:'⚖️ Balanced — 42% exposure'} },

    creator: { icon:'🎨', greeting:"Time to create something amazing.",
      stats:[{label:'Followers',value:'24.5K',suffix:'total'},{label:'This Week',value:'+840',suffix:'new'},{label:'Posts',value:'128',suffix:'published'},{label:'Avg. Views',value:'8.2K',suffix:'/post'}],
      mainWidget:{title:'Content Queue',items:[{icon:'🎬',name:'Video: Productivity Setup',time:'Draft'},{icon:'📸',name:'Instagram Carousel',time:'Editing'},{icon:'✍️',name:'Newsletter #42',time:'Writing'}]},
      secondaryWidget:{title:'Top Performing',rows:[{name:'Morning Routine Tips',score:'82K views',status:'done'},{name:'Desk Setup Tour',score:'56K views',status:'done'},{name:'AI Tools Guide',score:'41K views',status:'done'}]},
      sideWidget:{title:'Growth',content:'📈 +3.4% engagement this week'} },

    developer: { icon:'💻', greeting:"Ship something great today.",
      stats:[{label:'Commits',value:'142',suffix:'this mo'},{label:'Open PRs',value:'5',suffix:'pending'},{label:'Streak',value:'28',suffix:'days'},{label:'Issues',value:'12',suffix:'open'}],
      mainWidget:{title:'Active Projects',items:[{icon:'🚀',name:'nexus-core • v2.1',time:'In progress'},{icon:'🔧',name:'api-gateway refactor',time:'Review'},{icon:'📦',name:'ui-components',time:'Planning'}]},
      secondaryWidget:{title:'Recent Commits',rows:[{name:'feat: add auth flow',score:'2h ago',status:'done'},{name:'fix: dashboard layout',score:'5h ago',status:'done'},{name:'chore: update deps',score:'1d ago',status:'done'}]},
      sideWidget:{title:'Today',content:'⚡ 3 PRs merged · 12 commits'} },

    freelancer: { icon:'🧑‍💻', greeting:"Let's land some clients.",
      stats:[{label:'Active Gigs',value:'4',suffix:'running'},{label:'This Month',value:'₹42K',suffix:'earned'},{label:'Proposals',value:'9',suffix:'sent'},{label:'Rating',value:'4.9',suffix:'/5.0'}],
      mainWidget:{title:'Active Projects',items:[{icon:'🎨',name:'Landing Page — Acme',time:'2 days left'},{icon:'✍️',name:'Blog Articles — Tech',time:'In progress'},{icon:'📱',name:'App UI — Startup',time:'Feedback'}]},
      secondaryWidget:{title:'Recent Invoices',rows:[{name:'INV-0234 • Acme Inc',score:'₹12,000',status:'done'},{name:'INV-0233 • TechBlog',score:'₹8,500',status:'done'},{name:'INV-0235 • Startup',score:'Pending',status:'pending'}]},
      sideWidget:{title:'Time Logged',content:'⏱ 18h 42m this week'} },

    teacher: { icon:'📚', greeting:"Your students await.",
      stats:[{label:'Students',value:'86',suffix:'active'},{label:'Classes',value:'5',suffix:'today'},{label:'Assignments',value:'12',suffix:'to grade'},{label:'Avg. Score',value:'78',suffix:'%'}],
      mainWidget:{title:"Today's Classes",items:[{icon:'📘',name:'Mathematics — Class 10',time:'9:00 AM'},{icon:'⚛️',name:'Physics — Class 12',time:'11:30 AM'},{icon:'📐',name:'Geometry — Class 9',time:'3:00 PM'}]},
      secondaryWidget:{title:'Pending Grading',rows:[{name:'Physics Test — Batch A',score:'28 papers',status:'pending'},{name:'Math Assignment',score:'45 papers',status:'pending'},{name:'Chemistry Quiz',score:'18 papers',status:'done'}]},
      sideWidget:{title:'This Week',content:'📊 24 classes conducted'} },

    doctor: { icon:'🩺', greeting:"Ready for today's patients?",
      stats:[{label:'Appointments',value:'14',suffix:'today'},{label:'Patients',value:'320',suffix:'total'},{label:'Reports',value:'6',suffix:'to review'},{label:'Follow-ups',value:'9',suffix:'due'}],
      mainWidget:{title:"Today's Schedule",items:[{icon:'🩺',name:'Ravi Kumar — Checkup',time:'10:00 AM'},{icon:'💊',name:'Priya Singh — Follow-up',time:'11:30 AM'},{icon:'🔬',name:'Aditya Verma — Reports',time:'2:00 PM'}]},
      secondaryWidget:{title:'Pending Reports',rows:[{name:'Blood Test — Ravi K.',score:'Ready',status:'done'},{name:'MRI Scan — Priya S.',score:'In lab',status:'pending'},{name:'ECG — Aditya V.',score:'Ready',status:'done'}]},
      sideWidget:{title:'This Month',content:'👨‍⚕️ 168 consultations'} },

    other: { icon:'✨', greeting:"Let's build your custom workspace.",
      stats:[{label:'Active',value:'1',suffix:'workspace'},{label:'Tasks',value:'0',suffix:'pending'},{label:'Notes',value:'0',suffix:'saved'},{label:'Days',value:'1',suffix:'active'}],
      mainWidget:{title:'Getting Started',items:[{icon:'🚀',name:'Complete your profile',time:'Setup'},{icon:'📝',name:'Add your first task',time:'Optional'},{icon:'⚙️',name:'Customize widgets',time:'Soon'}]},
      secondaryWidget:{title:'Recent Activity',rows:[{name:'Account created',score:'Now',status:'done'},{name:'Role selected',score:'Just now',status:'done'},{name:'Setup complete',score:'Ready',status:'done'}]},
      sideWidget:{title:'Welcome',content:'✨ Your workspace is ready'} },
  };

  /* ---------- Helpers ---------- */
  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Working late';
  }

  /* ---------- Render Welcome ---------- */
  function renderWelcome() {
    const cfg = ROLE_CONFIG[state.role] || ROLE_CONFIG.student;
    const name = (state.user.name || state.username || 'User').split(' ')[0];

    const wTime = $('welcomeTime');
    const wName = $('welcomeName');
    const wMsg = $('welcomeMsg');
    if (wTime) wTime.textContent = greeting();
    if (wName) wName.textContent = name;
    if (wMsg) wMsg.textContent = cfg.greeting;

    const avatarL = $('avatarLetter');
    if (avatarL) avatarL.textContent = name.charAt(0).toUpperCase();

    const profileName = $('profileName');
    if (profileName) profileName.textContent = name;

    const panelName = $('panelName');
    if (panelName) panelName.textContent = state.user.name || 'User';

    const panelEmail = $('panelEmail');
    if (panelEmail) panelEmail.textContent = state.user.email || 'user@example.com';

    const sideRoleTag = $('sideRoleTag');
    if (sideRoleTag) sideRoleTag.textContent = `${cfg.icon} ${state.role}`;
  }

  /* ---------- Render Stats ---------- */
  function renderStats() {
    const row = $('statRow');
    if (!row) return;
    const cfg = ROLE_CONFIG[state.role] || ROLE_CONFIG.student;
    row.innerHTML = cfg.stats.map((s, i) => `
      <div class="nx-card p-4 anim anim-${Math.min(i+1,5)}">
        <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">${esc(s.label)}</p>
        <p class="text-2xl font-black text-white leading-none">${esc(s.value)}</p>
        <p class="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">${esc(s.suffix)}</p>
      </div>
    `).join('');
  }

  /* ---------- Render Main Widget ---------- */
  function renderMain() {
    const el = $('mainWidget');
    if (!el) return;
    const w = (ROLE_CONFIG[state.role] || ROLE_CONFIG.student).mainWidget;
    el.innerHTML = `
      <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-1 h-4 rounded bg-gradient-to-b from-cyan-400 to-blue-500"></span>
        ${esc(w.title)}
      </h3>
      <ul class="space-y-2">
        ${w.items.map(it => `
          <li class="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-cyan-500/20 transition-all cursor-pointer">
            <span class="text-lg leading-none">${it.icon}</span>
            <span class="flex-1 text-sm font-medium text-slate-200 truncate">${esc(it.name)}</span>
            <span class="text-xs text-slate-500 whitespace-nowrap">${esc(it.time)}</span>
          </li>
        `).join('')}
      </ul>`;
  }

  /* ---------- Render Secondary ---------- */
  function renderSecondary() {
    const el = $('secondaryWidget');
    if (!el) return;
    const w = (ROLE_CONFIG[state.role] || ROLE_CONFIG.student).secondaryWidget;
    const badge = s => s === 'done'
      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
      : 'bg-amber-500/15 text-amber-300 border border-amber-500/25';
    el.innerHTML = `
      <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <span class="w-1 h-4 rounded bg-gradient-to-b from-cyan-400 to-blue-500"></span>
        ${esc(w.title)}
      </h3>
      <ul class="space-y-2">
        ${w.rows.map(r => `
          <li class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all">
            <span class="flex-1 text-sm text-slate-200 truncate">${esc(r.name)}</span>
            <span class="text-xs font-semibold text-slate-400 whitespace-nowrap">${esc(r.score)}</span>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge(r.status)}">${esc(r.status)}</span>
          </li>
        `).join('')}
      </ul>`;
  }

  /* ---------- Render Side ---------- */
  function renderSide() {
    const el = $('sideWidget');
    if (!el) return;
    const w = (ROLE_CONFIG[state.role] || ROLE_CONFIG.student).sideWidget;
    el.innerHTML = `
      <h3 class="text-base font-bold text-white mb-3 flex items-center gap-2">
        <span class="w-1 h-4 rounded bg-gradient-to-b from-cyan-400 to-blue-500"></span>
        ${esc(w.title)}
      </h3>
      <p class="text-sm text-slate-300 leading-relaxed">${esc(w.content)}</p>`;
  }

  /* ---------- Sidebar / Dropdowns ---------- */
  window.toggleSidebar = function() {
    const s = $('sidebar'), b = $('sidebarBackdrop');
    if (s) s.classList.toggle('open');
    if (b) b.classList.toggle('hidden');
  };

  window.handleLogout = function() {
    if (!confirm('Sign out?')) return;
    API.auth.logout();
    try {
      localStorage.removeItem('nexus_user_role');
      localStorage.removeItem('nexus_username');
      localStorage.removeItem('nexus_secret_code');
    } catch (e) {}
    if (window.SocketClient) window.SocketClient.disconnect();
    window.location.href = 'index.html';
  };

  function bindDropdowns() {
    const nB = $('notifBtn'), nP = $('notifPanel');
    const pB = $('profileBtn'), pP = $('profilePanel');
    if (!nB || !pB) return;
    const close = () => { nP?.classList.add('hidden'); pP?.classList.add('hidden'); };
    nB.addEventListener('click', e => { e.stopPropagation(); pP?.classList.add('hidden'); nP?.classList.toggle('hidden'); });
    pB.addEventListener('click', e => { e.stopPropagation(); nP?.classList.add('hidden'); pP?.classList.toggle('hidden'); });
    document.addEventListener('click', close);
    [nP, pP].forEach(p => p && p.addEventListener('click', e => e.stopPropagation()));
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    // Auth guard
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    // Fetch fresh user data
    try {
      const res = await API.auth.me();
      state.user = res.user || {};
      state.role = state.user.role || localStorage.getItem('nexus_user_role') || 'student';
      state.username = state.user.username || '';
      state.secret = (localStorage.getItem('nexus_secret_code') || '').toLowerCase();

      // Cache
      try {
        localStorage.setItem('nexus_user_role', state.role);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load user:', err);
      API.Token.remove();
      window.location.href = 'auth.html';
      return;
    }

    // Render
    renderWelcome();
    renderStats();
    renderMain();
    renderSecondary();
    renderSide();
    bindDropdowns();

    console.log('%c⚡ NEXUS DASHBOARD READY', 'color:#22d3ee;font-weight:bold');
    console.log('User:', state.user.name, '| Role:', state.role);
  });

})();