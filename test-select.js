/**
 * TEST-SELECT.JS — Nexus Subject & Chapter Selection Flow
 * Reads student's saved academic profile (never re-asking board/class/medium).
 * Only displays subjects enrolled by the student.
 * Dynamically queries board-specific chapters with phase cutoffs.
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let currentProfile = {};
  let currentSubjectCode = null;
  let activeMode = 'chapter'; // 'chapter' or 'full'

  window.setTestMode = function (mode) {
    activeMode = mode;
    const cardCh = $('modeCardChapter');
    const cardFull = $('modeCardFull');
    const secCh = $('chapterSection');
    const secFull = $('fullPaperSection');

    if (mode === 'chapter') {
      cardCh?.classList.add('border-cyan-500/40', 'bg-cyan-500/[0.04]');
      cardCh?.classList.remove('opacity-75');
      cardFull?.classList.remove('border-blue-500/40', 'bg-blue-500/[0.04]');
      cardFull?.classList.add('opacity-75');
      secCh?.classList.remove('hidden');
      secFull?.classList.add('hidden');
      loadChapters();
    } else {
      cardFull?.classList.add('border-blue-500/40', 'bg-blue-500/[0.04]');
      cardFull?.classList.remove('opacity-75');
      cardCh?.classList.remove('border-cyan-500/40', 'bg-cyan-500/[0.04]');
      cardCh?.classList.add('opacity-75');
      secFull?.classList.remove('hidden');
      secCh?.classList.add('hidden');
      loadOfficialPapers();
    }
  };

  async function loadChapters() {
    const listGrid = $('chapterListGrid');
    const countLabel = $('chapterCountLabel');
    const phaseSelect = $('phaseFilter');
    const phase = phaseSelect ? phaseSelect.value : null;

    if (!listGrid || !currentSubjectCode) return;

    listGrid.innerHTML = `
      <div class="text-center py-8">
        <div class="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-xs text-slate-400">Loading syllabus chapters…</p>
      </div>
    `;

    try {
      const res = await API.tests.getChapters(
        currentProfile.board || 'ncert_default',
        currentProfile.classLevel || '10',
        currentSubjectCode,
        currentProfile.stream || null,
        phase
      );

      const chapters = res.chapters || [];
      if (countLabel) {
        countLabel.textContent = `${chapters.length} chapters in syllabus • ${currentProfile.formattedBadge}`;
      }

      if (chapters.length === 0) {
        listGrid.innerHTML = `
          <div class="p-8 text-center rounded-xl bg-white/[0.01] border border-white/5">
            <p class="text-sm font-semibold text-slate-300 mb-1">No chapters found for this filter</p>
            <p class="text-xs text-slate-500">Try changing the exam phase cutoff filter above.</p>
          </div>
        `;
        return;
      }

      listGrid.innerHTML = chapters.map((ch) => {
        const isLive = ch.isLive || ch.statusLabel === 'Live';
        return `
          <div class="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
            <div class="flex items-start gap-3">
              <span class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                ${ch.chapterNumber < 10 ? '0' + ch.chapterNumber : ch.chapterNumber}
              </span>
              <div>
                <h4 class="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  ${esc(ch.title)}
                </h4>
                ${ch.hindiTitle ? `<p class="text-xs text-slate-400 mt-0.5">${esc(ch.hindiTitle)}</p>` : ''}
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="text-[10px] text-slate-500 font-medium capitalize">
                    Cutoff: ${ch.phaseCutoff ? ch.phaseCutoff.replace('_', ' ') : 'Annual'}
                  </span>
                  <span class="text-slate-600">•</span>
                  <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isLive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-slate-500/15 text-slate-400 border border-slate-500/25'
                  }">
                    ${isLive ? 'Live' : 'Coming soon'}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button onclick="startChapterTest(${ch.chapterNumber}, '${encodeURIComponent(ch.title)}')"
                      class="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-ink-950 font-bold text-xs border border-cyan-500/30 hover:border-transparent transition-all flex items-center gap-1.5">
                <span>Start Practice</span>
                <span>→</span>
              </button>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error('loadChapters error:', err);
      listGrid.innerHTML = `
        <div class="p-6 text-center text-xs text-red-400">
          Failed to load chapters: ${err.message || 'Server error'}
        </div>
      `;
    }
  }

  window.selectSubject = function (code) {
    currentSubjectCode = code;
    document.querySelectorAll('.subject-tab-btn').forEach((btn) => {
      const match = btn.getAttribute('data-code') === code;
      btn.classList.toggle('bg-cyan-500/20', match);
      btn.classList.toggle('border-cyan-500/50', match);
      btn.classList.toggle('text-white', match);
      btn.classList.toggle('bg-white/[0.02]', !match);
      btn.classList.toggle('border-white/10', !match);
      btn.classList.toggle('text-slate-300', !match);
    });

    if (activeMode === 'full') {
      loadOfficialPapers();
    } else {
      loadChapters();
    }
  };

  window.loadOfficialPapers = async function () {
    const listGrid = $('paperListGrid');
    const countLabel = $('paperCountLabel');
    const phaseSelect = $('paperPhaseFilter');
    const yearSelect = $('paperYearFilter');
    const phase = phaseSelect ? phaseSelect.value : null;
    const year = yearSelect ? yearSelect.value : null;

    if (!listGrid || !currentSubjectCode) return;

    listGrid.innerHTML = `
      <div class="text-center py-8">
        <div class="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-xs text-slate-400">Loading official board papers…</p>
      </div>
    `;

    try {
      const res = await API.tests.getAvailablePapers(currentSubjectCode, phase);
      let papers = res.papers || [];

      if (year) {
        papers = papers.filter(p => String(p.year) === String(year));
      }

      if (countLabel) {
        countLabel.textContent = `${papers.length} official papers available • ${currentProfile.formattedBadge || ''}`;
      }

      if (papers.length === 0) {
        listGrid.innerHTML = `
          <div class="p-8 text-center rounded-xl bg-white/[0.01] border border-white/5">
            <div class="text-3xl mb-2">📜</div>
            <p class="text-sm font-semibold text-slate-300 mb-1">No official papers available for this filter</p>
            <p class="text-xs text-slate-500 max-w-md mx-auto">
              Only board exam papers whose scheduled dates have passed are published, protecting curriculum integrity. Try changing the exam phase or year filter.
            </p>
          </div>
        `;
        return;
      }

      listGrid.innerHTML = papers.map((p) => {
        const mvviCount = p.mvviCount || 0;
        const vviCount = p.vviCount || 0;
        const setLabel = p.setCode ? `Set ${p.setCode}` : '';
        const phaseLabel = (p.examPhase || 'Annual').replace('_', ' ').toUpperCase();

        return `
          <div class="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4 group">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  ${p.year}
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.05] text-slate-300 border border-white/10 uppercase tracking-wider">
                  ${phaseLabel}
                </span>
                ${setLabel ? `
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    ${setLabel}
                  </span>
                ` : ''}
                ${mvviCount > 0 ? `
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    🔥 ${mvviCount} MVVI
                  </span>
                ` : ''}
                ${vviCount > 0 ? `
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    ⭐ ${vviCount} VVI
                  </span>
                ` : ''}
              </div>

              <h4 class="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                ${esc(p.paperCode)}
              </h4>

              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                <span>📝 ${p.totalQuestions} Questions</span>
                <span class="text-slate-600">•</span>
                <span>🎯 ${p.totalMarks} Marks</span>
                ${p.sourceCreditText ? `
                  <span class="text-slate-600">•</span>
                  <span class="text-slate-500 text-[11px] truncate max-w-xs" title="${esc(p.sourceCreditText)}">
                    🏛️ ${esc(p.sourceCreditText)}
                  </span>
                ` : ''}
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button onclick="startOfficialPaper('${esc(p.paperId)}')"
                      class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-ink-950 font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer">
                <span>Start Full Exam</span>
                <span>→</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('loadOfficialPapers error:', err);
      listGrid.innerHTML = `
        <div class="p-6 text-center text-xs text-red-400">
          Failed to load official papers: ${err.message || 'Server error'}
        </div>
      `;
    }
  };

  window.startOfficialPaper = function (paperId) {
    const isHardMode = !!$('hardModeToggle')?.checked;
    window.location.href = `test-live.html?paperId=${encodeURIComponent(paperId)}&subject=${encodeURIComponent(currentSubjectCode)}${isHardMode ? '&hard=1' : ''}`;
  };

  let pollingInterval = null;

  window.startChapterTest = async function (chapterNumber, rawTitle) {
    const title = decodeURIComponent(rawTitle || '');
    const isHardMode = !!$('hardModeToggle')?.checked;
    const modal = $('lazySetupModal');
    const pBar = $('lazyProgressBar');
    const pPercent = $('lazyProgressPercent');
    const pMsg = $('lazyProgressMsg');

    try {
      // 1. Ask backend if questions exist or need lazy loading setup
      const res = await API.tests.prepareChapter({
        subjectCode: currentSubjectCode,
        chapterNumber: Number(chapterNumber),
        isHardMode,
        targetCount: 10,
      });

      if (res.ready) {
        // Questions are ready! Open Live Test runner directly
        window.location.href = `test-live.html?subject=${encodeURIComponent(currentSubjectCode)}&chapter=${encodeURIComponent(chapterNumber)}${isHardMode ? '&hard=1' : ''}`;
        return;
      }

      // 2. Open lazy loading setup dialog and poll background job
      if (modal) {
        modal.classList.remove('hidden');
        if (pBar) pBar.style.width = (res.progressPercent || 15) + '%';
        if (pPercent) pPercent.textContent = (res.progressPercent || 15) + '%';
        if (pMsg) pMsg.textContent = res.progressMessage || 'Preparing questions…';
      }

      if (pollingInterval) clearInterval(pollingInterval);

      pollingInterval = setInterval(async () => {
        try {
          const jobRes = await API.tests.getJobStatus(res.jobId);
          const job = jobRes.job;
          if (!job) return;

          if (pBar) pBar.style.width = Math.max(15, job.progressPercent) + '%';
          if (pPercent) pPercent.textContent = job.progressPercent + '%';
          if (pMsg) pMsg.textContent = job.progressMessage;

          if (job.status === 'completed') {
            clearInterval(pollingInterval);
            if (pMsg) pMsg.textContent = 'Questions verified! Launching practice session…';
            setTimeout(() => {
              window.location.href = `test-live.html?subject=${encodeURIComponent(currentSubjectCode)}&chapter=${encodeURIComponent(chapterNumber)}${isHardMode ? '&hard=1' : ''}`;
            }, 750);
          } else if (job.status === 'failed') {
            clearInterval(pollingInterval);
            alert(job.error || 'Failed to generate questions. Please try again in a little while.');
            modal?.classList.add('hidden');
          }
        } catch (e) {
          console.warn('Polling error:', e);
        }
      }, 2000);

    } catch (err) {
      alert(err.message || 'Could not prepare test questions');
      modal?.classList.add('hidden');
    }
  };

  async function init() {
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    const badgeLine = $('tsAcademicLine');
    const tabsWrap = $('subjectTabs');
    const phaseSelect = $('phaseFilter');
    const fallbackWrap = $('fallbackNoticeWrap');
    const fallbackText = $('fallbackNoticeText');

    try {
      // 1) Fetch student academic profile
      const profRes = await API.tests.getProfile();
      currentProfile = profRes.profile || {};

      if (badgeLine && currentProfile.formattedBadge) {
        badgeLine.textContent = currentProfile.formattedBadge;
      }

      if (currentProfile.isUsingFallback && fallbackWrap) {
        fallbackWrap.classList.remove('hidden');
        if (fallbackText) fallbackText.textContent = currentProfile.fallbackNotice || 'Applied NCERT default curriculum.';
      }

      // 2) Populate subjects tabs (only enrolled subjects!)
      const enrolledSubjects = currentProfile.selectedSubjects || [];
      if (enrolledSubjects.length === 0) {
        if (tabsWrap) {
          tabsWrap.innerHTML = `
            <div class="p-4 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-xs text-amber-200">
              No subjects enrolled yet. Please configure your subjects in <a href="settings.html" class="underline font-bold">Settings</a>.
            </div>
          `;
        }
        return;
      }

      // Read pre-selected subject from URL ?subject=sci
      const urlParams = new URLSearchParams(window.location.search);
      const urlSubject = urlParams.get('subject');
      const urlMode = urlParams.get('mode');

      currentSubjectCode = urlSubject && enrolledSubjects.some((s) => s.code === urlSubject)
        ? urlSubject
        : enrolledSubjects[0].code;

      if (tabsWrap) {
        tabsWrap.innerHTML = enrolledSubjects.map((sub) => {
          const isSelected = sub.code === currentSubjectCode;
          return `
            <button onclick="selectSubject('${esc(sub.code)}')" data-code="${esc(sub.code)}"
                    class="subject-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                        : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20'
                    }">
              <span>${sub.icon || '📚'}</span>
              <span>${esc(sub.name)}</span>
            </button>
          `;
        }).join('');
      }

      phaseSelect?.addEventListener('change', loadChapters);

      if (urlMode === 'full') {
        window.setTestMode('full');
      } else {
        loadChapters();
      }

    } catch (err) {
      console.error('Init error:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
