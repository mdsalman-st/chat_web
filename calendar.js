/* ============================================================================
   CALENDAR.JS — Interactive Calendar & Schedule with Task Sync
   ============================================================================ */

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const STORAGE_KEY = 'nexus_calendar_events';

  let currentYear, currentMonth;
  let activeFilter = 'all';
  let events = [];
  let userTasks = [];

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const COLOR_MAP = {
    cyan:    { bg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' },
    rose:    { bg: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
    emerald: { bg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
    violet:  { bg: 'bg-violet-500/20 text-violet-300 border border-violet-500/30' },
    amber:   { bg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' }
  };

  /* Seed initial events if none found */
  function getStoredEvents() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    const defaults = [
      {
        id: 'ev-1',
        title: 'Project Sprint Review',
        date: `${y}-${m}-${d}`,
        time: '11:00',
        category: 'work',
        color: 'cyan',
        desc: 'Review upcoming deliverables with team.'
      },
      {
        id: 'ev-2',
        title: 'Nexus System Sync',
        date: `${y}-${m}-${String(Math.min(28, now.getDate() + 2)).padStart(2, '0')}`,
        time: '15:30',
        category: 'meeting',
        color: 'violet',
        desc: 'Architecture sync and feature review.'
      },
      {
        id: 'ev-3',
        title: 'Q2 Goal Assessment',
        date: `${y}-${m}-${String(Math.min(28, now.getDate() + 4)).padStart(2, '0')}`,
        time: '18:00',
        category: 'deadline',
        color: 'rose',
        desc: 'Final submission deadline.'
      }
    ];
    saveEvents(defaults);
    return defaults;
  }

  function saveEvents(evs) {
    events = evs;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {}
  }

  /* ---------- Calendar Rendering ---------- */
  function renderCalendar() {
    const grid = $('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const label = $('monthYearLabel');
    if (label) label.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
    const todayDate = today.getDate();

    // Combine custom events + user tasks as calendar items
    const allItems = [...events];
    userTasks.forEach(task => {
      if (task.dueDate) {
        allItems.push({
          id: 'task-' + (task._id || task.id),
          title: `[Task] ${task.title}`,
          date: task.dueDate.split('T')[0],
          time: '',
          category: 'deadline',
          color: task.completed ? 'emerald' : 'amber',
          desc: task.notes || 'From Tasks list',
          isTask: true,
          completed: task.completed
        });
      }
    });

    // 1. Previous month trailing days
    for (let x = firstDayIndex; x > 0; x--) {
      const dayNum = prevMonthDays - x + 1;
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell p-1.5 sm:p-2 rounded-xl bg-white/[0.01] border border-white/[0.02] text-slate-600 opacity-40 select-none';
      cell.innerHTML = `<span class="text-xs font-semibold">${dayNum}</span>`;
      grid.appendChild(cell);
    }

    // 2. Current month days
    for (let d = 1; d <= totalDays; d++) {
      const cell = document.createElement('div');
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = isCurrentMonth && d === todayDate;

      cell.className = `cal-day-cell p-1.5 sm:p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] cursor-pointer flex flex-col justify-between ${
        isToday ? 'cal-today shadow-[0_0_15px_rgba(34,211,238,0.15)]' : ''
      }`;

      // Day header
      const dayHeader = `
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold ${isToday ? 'text-cyan-400 font-extrabold' : 'text-slate-300'}">${d}</span>
          ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>' : ''}
        </div>
      `;

      // Filter events for this day
      const dayEvents = allItems.filter(e => {
        if (e.date !== dateStr) return false;
        if (activeFilter !== 'all') {
          if (activeFilter === 'deadline' && e.category !== 'deadline') return false;
          if (activeFilter === 'work' && e.category !== 'work' && e.category !== 'meeting') return false;
          if (activeFilter === 'personal' && e.category !== 'personal' && e.category !== 'study') return false;
        }
        return true;
      });

      let eventsHtml = '<div class="space-y-1 overflow-hidden flex-1">';
      dayEvents.slice(0, 3).forEach(ev => {
        const c = COLOR_MAP[ev.color] || COLOR_MAP.cyan;
        eventsHtml += `
          <div class="event-pill ${c.bg}" onclick="event.stopPropagation(); showEventDetail('${ev.id}')" title="${esc(ev.title)}">
            ${ev.time ? `<span class="opacity-75 text-[10px] mr-1">${esc(ev.time)}</span>` : ''}
            <span>${esc(ev.title)}</span>
          </div>
        `;
      });
      if (dayEvents.length > 3) {
        eventsHtml += `<div class="text-[10px] text-cyan-400 font-semibold pl-1">+${dayEvents.length - 3} more</div>`;
      }
      eventsHtml += '</div>';

      cell.innerHTML = dayHeader + eventsHtml;
      cell.addEventListener('click', () => openAddEventModal(dateStr));
      grid.appendChild(cell);
    }

    // 3. Next month leading days
    const totalRendered = firstDayIndex + totalDays;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell p-1.5 sm:p-2 rounded-xl bg-white/[0.01] border border-white/[0.02] text-slate-600 opacity-40 select-none';
      cell.innerHTML = `<span class="text-xs font-semibold">${i}</span>`;
      grid.appendChild(cell);
    }

    renderUpcomingList(allItems);
    updateQuickStats(allItems);
  }

  /* Render upcoming events in right sidebar */
  function renderUpcomingList(allItems) {
    const list = $('upcomingEventsList');
    if (!list) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = allItems
      .filter(e => {
        if (e.date < todayStr) return false;
        if (activeFilter !== 'all') {
          if (activeFilter === 'deadline' && e.category !== 'deadline') return false;
          if (activeFilter === 'work' && e.category !== 'work' && e.category !== 'meeting') return false;
          if (activeFilter === 'personal' && e.category !== 'personal' && e.category !== 'study') return false;
        }
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    if (upcoming.length === 0) {
      list.innerHTML = `
        <div class="text-center py-6 text-slate-500 text-xs">
          <p class="text-xl mb-1">🎉</p>
          <p>No upcoming events found</p>
        </div>
      `;
      return;
    }

    list.innerHTML = upcoming.map(ev => {
      const c = COLOR_MAP[ev.color] || COLOR_MAP.cyan;
      const dateParts = ev.date.split('-');
      const monthShort = MONTH_NAMES[parseInt(dateParts[1], 10) - 1].slice(0, 3);
      const dayNum = dateParts[2];

      return `
        <div onclick="showEventDetail('${ev.id}')" class="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] flex items-center gap-3 cursor-pointer transition-all">
          <div class="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex flex-col items-center justify-center shrink-0">
            <span class="text-[9px] uppercase font-bold text-cyan-400">${monthShort}</span>
            <span class="text-xs font-black text-white leading-none">${dayNum}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-white truncate">${esc(ev.title)}</p>
            <p class="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
              ${ev.time ? `<span>⏰ ${esc(ev.time)}</span>` : ''}
              <span class="capitalize px-1.5 py-0.2 rounded ${c.bg}">${esc(ev.category || 'event')}</span>
            </p>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateQuickStats(allItems) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if ($('todayDateBig')) {
      $('todayDateBig').textContent = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    const todayEvents = allItems.filter(e => e.date === todayStr);
    if ($('todayEventCount')) {
      $('todayEventCount').textContent = todayEvents.length === 0
        ? 'No events scheduled today'
        : `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} scheduled today`;
    }
  }

  /* Navigation */
  window.calPrevMonth = function () {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  };

  window.calNextMonth = function () {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  };

  window.calToday = function () {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    renderCalendar();
  };

  window.filterEvents = function (cat) {
    activeFilter = cat;
    document.querySelectorAll('.event-filter-btn').forEach(btn => {
      const match = btn.getAttribute('data-f') === cat;
      btn.classList.toggle('bg-cyan-500/20', match);
      btn.classList.toggle('text-cyan-300', match);
      btn.classList.toggle('text-slate-400', !match);
    });
    renderCalendar();
  };

  /* Modal Controls */
  window.openAddEventModal = function (dateStr = '') {
    const modal = $('eventModal');
    if (!modal) return;
    $('eventForm').reset();
    $('eventId').value = '';
    $('modalTitle').textContent = 'Create New Event';
    $('deleteEventBtn').classList.add('hidden');

    const defaultDate = dateStr || new Date().toISOString().split('T')[0];
    $('eventDate').value = defaultDate;
    $('eventTime').value = '10:00';
    $('eventCategory').value = 'work';
    $('eventColor').value = 'cyan';

    modal.classList.remove('hidden');
  };

  window.closeEventModal = function () {
    const modal = $('eventModal');
    if (modal) modal.classList.add('hidden');
  };

  window.showEventDetail = function (id) {
    const ev = events.find(e => e.id === id);
    if (!ev) {
      // Might be a synced task
      const task = userTasks.find(t => 'task-' + (t._id || t.id) === id);
      if (task) {
        alert(`Task: ${task.title}\nDue: ${task.dueDate ? task.dueDate.split('T')[0] : 'N/A'}\nStatus: ${task.completed ? 'Completed' : 'Pending'}`);
      }
      return;
    }

    const modal = $('eventModal');
    if (!modal) return;

    $('eventId').value = ev.id;
    $('modalTitle').textContent = 'Edit Event';
    $('eventTitle').value = ev.title || '';
    $('eventDate').value = ev.date || '';
    $('eventTime').value = ev.time || '';
    $('eventCategory').value = ev.category || 'work';
    $('eventColor').value = ev.color || 'cyan';
    $('eventDesc').value = ev.desc || '';

    $('deleteEventBtn').classList.remove('hidden');
    modal.classList.remove('hidden');
  };

  window.handleSaveEvent = function (e) {
    e.preventDefault();
    const id = $('eventId').value;
    const title = $('eventTitle').value.trim();
    const date = $('eventDate').value;
    const time = $('eventTime').value;
    const category = $('eventCategory').value;
    const color = $('eventColor').value;
    const desc = $('eventDesc').value.trim();

    if (!title || !date) return;

    if (id) {
      const idx = events.findIndex(ev => ev.id === id);
      if (idx !== -1) {
        events[idx] = { ...events[idx], title, date, time, category, color, desc };
      }
    } else {
      events.push({
        id: 'ev-' + Date.now(),
        title,
        date,
        time,
        category,
        color,
        desc
      });
    }

    saveEvents(events);
    closeEventModal();
    renderCalendar();
  };

  window.handleDeleteEvent = function () {
    const id = $('eventId').value;
    if (!id) return;
    if (!confirm('Delete this event?')) return;
    saveEvents(events.filter(e => e.id !== id));
    closeEventModal();
    renderCalendar();
  };

  /* Dropdowns */
  function bindDropdowns() {
    const nB = $('notifBtn'), nP = $('notifPanel');
    const pB = $('profileBtn'), pP = $('profilePanel');
    if (!nB || !pB) return;
    const close = () => { nP?.classList.add('hidden'); pP?.classList.add('hidden'); };
    nB.addEventListener('click', e => { e.stopPropagation(); pP?.classList.add('hidden'); nP?.classList.toggle('hidden'); });
    pB.addEventListener('click', e => { e.stopPropagation(); nP?.classList.add('hidden'); pP?.classList.toggle('hidden'); });
    document.addEventListener('click', close);
  }

  /* Initialization */
  document.addEventListener('DOMContentLoaded', async () => {
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();

    events = getStoredEvents();

    try {
      const me = await API.auth.me();
      const user = me.user || {};
      const name = (user.name || 'User').split(' ')[0];
      if ($('avatarLetter')) $('avatarLetter').textContent = name.charAt(0).toUpperCase();
      if ($('profileName')) $('profileName').textContent = name;
      if ($('panelName')) $('panelName').textContent = user.name || 'User';
      if ($('panelEmail')) $('panelEmail').textContent = user.email || '';
      if ($('sideRoleTag')) $('sideRoleTag').textContent = user.role || 'workspace';
    } catch (e) {}

    // Fetch existing tasks to sync deadlines into calendar
    try {
      const res = await API.tasks.list();
      userTasks = res.tasks || [];
    } catch (e) {}

    bindDropdowns();
    renderCalendar();
  });

})();
