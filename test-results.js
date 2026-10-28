/**
 * TEST-RESULTS.JS — Nexus Test Results Page Logic
 * Handles both single result view (?attemptId=...) and recent results list view
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": ''' }[c]));

  let currentAttemptId = null;
  let currentResult = null;
  let currentFilter = 'all';

  async function init() {
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    currentAttemptId = params.get('attemptId');

    if (currentAttemptId) {
      // Single result view
      await loadSingleResult(currentAttemptId);
    } else {
      // Recent results list view
      await loadRecentResults();
    }
  }

  async function loadSingleResult(attemptId) {
    const loadingEl = $('loadingResults');
    const singleView = $('singleResultView');
    const recentView = $('recentResultsView');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (singleView) singleView.classList.add('hidden');
    if (recentView) recentView.classList.add('hidden');

    try {
      const res = await API.tests.getResult(attemptId);
      currentResult = res.result;

      if (loadingEl) loadingEl.classList.add('hidden');
      if (singleView) singleView.classList.remove('hidden');

      renderSingleResult(currentResult);
    } catch (err) {
      console.error('loadSingleResult error:', err);
      if (loadingEl) loadingEl.classList.add('hidden');
      if (singleView) singleView.classList.remove('hidden');
      renderError('Failed to load test result: ' + (err.message || 'Unknown error'));
    }
  }

  async function loadRecentResults() {
    const loadingEl = $('loadingResults');
    const singleView = $('singleResultView');
    const recentView = $('recentResultsView');
    const listEl = $('recentResultsList');
    const noResultsEl = $('noResultsMsg');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (singleView) singleView.classList.add('hidden');
    if (recentView) recentView.classList.remove('hidden');

    try {
      const res = await API.tests.getRecentResults(20);
      const results = res.results || [];

      if (loadingEl) loadingEl.classList.add('hidden');

      if (results.length === 0) {
        if (listEl) listEl.innerHTML = '';
        if (noResultsEl) noResultsEl.classList.remove('hidden');
        return;
      }

      if (noResultsEl) noResultsEl.classList.add('hidden');
      if (listEl) {
        listEl.innerHTML = results.map((r, idx) => renderRecentResultCard(r, idx)).join('');
      }
    } catch (err) {
      console.error('loadRecentResults error:', err);
      if (loadingEl) loadingEl.classList.add('hidden');
      if (listEl) listEl.innerHTML = '<div class="p-6 text-center text-red-400">Failed to load results</div>';
    }
  }

  function renderSingleResult(result) {
    if (!result) return;

    const score = result.score || {};
    const ai = result.aiAnalysis || {};
    const percentage = score.percentage || 0;

    // Diagnostic Analysis & PDF Report Status
    const stBadge = $('analysisStatusBadge');
    const stText = $('analysisStatusText');
    if (stBadge && stText) {
      const status = result.aiAnalysisStatus || 'completed';
      if (status === 'queued' || status === 'processing') {
        stBadge.textContent = 'Generating insights...';
        stBadge.className = 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse';
        stText.textContent = `AI is evaluating mistake reasons and deep concept diagnostic insights (ETA: ${result.aiAnalysisEta || '1-2 min'}).`;
        if (!window._analysisPollTimer) {
          window._analysisPollTimer = setTimeout(() => {
            window._analysisPollTimer = null;
            loadSingleResult(currentAttemptId);
          }, 4000);
        }
      } else {
        stBadge.textContent = 'Ready';
        stBadge.className = 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        stText.textContent = 'Complete question breakdown with Hindi Devanagari font & AI mistake insights.';
      }
    }

    // Score Ring Animation
    const ring = $('scoreRing');
    const percentEl = $('scorePercent');
    const labelEl = $('scoreLabel');
    if (ring && percentEl && labelEl) {
      const circumference = 2 * Math.PI * 15.9155; // ~100
      const offset = circumference * (1 - percentage / 100);
      ring.style.strokeDasharray = `${circumference} ${circumference}`;
      ring.style.strokeDashoffset = offset;
      percentEl.textContent = percentage + '%';
      labelEl.textContent = `${score.obtainedMarks || 0}/${score.totalMarks || 0}`;
    }

    // Performance Badge
    const badgeEl = $('performanceBadge');
    if (badgeEl) {
      const level = ai.performanceLevel || 'Average';
      const badgeClass = getPerformanceBadgeClass(level);
      badgeEl.textContent = level;
      badgeEl.className = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border ' + badgeClass;
    }

    const subjectEl = $('resultSubject');
    if (subjectEl) subjectEl.textContent = result.subjectName || result.subjectCode || 'Subject';

    const chapterEl = $('resultChapter');
    if (chapterEl) {
      const chTitle = result.chapterTitle || (result.chapterNumber ? 'Chapter ' + result.chapterNumber : 'Full Paper');
      chapterEl.textContent = chTitle;
    }

    const scEl = $('resultSourceCredit');
    const scText = $('resultSourceCreditText');
    if (scEl && scText) {
      if (result.sourceCreditText) {
        scText.textContent = result.sourceCreditText;
        scEl.classList.remove('hidden');
      } else {
        scEl.classList.add('hidden');
      }
    }

    // Stats
    const setText = (id, val) => { const e = $(id); if (e) e.textContent = val; };
    setText('rCorrect', score.correct || 0);
    setText('rIncorrect', score.incorrect || 0);
    setText('rSkipped', score.skipped || 0);
    setText('rDuration', formatDuration(result.durationMs));
    setText('rEasy', (score.easyCorrect || 0) + '/' + (score.easyTotal || 0));
    setText('rMedium', (score.mediumCorrect || 0) + '/' + (score.mediumTotal || 0));
    setText('rHard', (score.hardCorrect || 0) + '/' + (score.hardTotal || 0));

    // AI Analysis
    const remarkEl = $('aiRemark');
    if (remarkEl) remarkEl.textContent = ai.overallRemark || 'Analysis not available.';

    const renderList = (id, items, emptyText) => {
      const el = $(id);
      if (!el) return;
      if (!items || items.length === 0) {
        el.innerHTML = '<li class="text-xs text-slate-500">' + esc(emptyText) + '</li>';
        return;
      }
      el.innerHTML = items.map(item => '<li class="text-xs text-slate-300 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-current"></span>' + esc(item) + '</li>').join('');
    };

    renderList('aiStrengths', ai.strengths, 'Keep practicing to build strengths!');
    renderList('aiWeakAreas', ai.weakAreas, 'No specific weak areas detected.');
    renderList('aiRecommendations', ai.recommendations, 'Continue your current study pace.');

    // Answer Review
    renderAnswersReview(result.answers || []);
  }

  function renderAnswersReview(answers) {
    const listEl = $('answersReviewList');
    if (!listEl) return;

    listEl.innerHTML = answers.map((ans, idx) => {
      const isCorrect = ans.isCorrect;
      const isSkipped = ans.isSkipped;
      const statusClass = isSkipped ? 'skipped' : (isCorrect ? 'correct' : 'incorrect');
      const statusLabel = isSkipped ? 'Skipped' : (isCorrect ? 'Correct' : 'Incorrect');
      const statusColor = isSkipped ? 'text-amber-400' : (isCorrect ? 'text-emerald-400' : 'text-red-400');
      const statusBg = isSkipped ? 'bg-amber-500/10 border-amber-500/20' : (isCorrect ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20');

      const qText = ans.questionText || 'Question not available';
      const selectedOpt = ans.selectedOption || '—';
      const correctOpt = ans.correctOption || '—';
      const explanation = ans.explanation || 'No explanation available.';

      return `
        <div class="answer-slide p-4 rounded-xl border ${statusBg} transition-all" data-filter="${statusClass}" style="animation-delay:${idx * 0.05}s">
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              <span class="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 font-bold text-xs flex items-center justify-center shrink-0">${idx + 1}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-white leading-snug">${esc(qText)}</p>
                ${ans.hindiQuestionText && ans.hindiQuestionText !== ans.questionText ? '<p class="text-xs text-slate-400 mt-0.5">' + esc(ans.hindiQuestionText) + '</p>' : ''}
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              ${ans.isMVVI || ans.mvviTag?.tag === 'MVVI' ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">🔥 MVVI</span>
              ` : ans.isVVI || ans.mvviTag?.tag === 'VVI' ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">⭐ VVI</span>
              ` : ''}
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor} border ${statusColor}">${statusLabel}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
            <div class="p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <p class="text-slate-500">Your Answer</p>
              <p class="font-bold text-white">${esc(selectedOpt)}</p>
            </div>
            <div class="p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <p class="text-slate-500">Correct Answer</p>
              <p class="font-bold text-emerald-400">${esc(correctOpt)}</p>
            </div>
            <div class="p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <p class="text-slate-500">Marks</p>
              <p class="font-bold text-white">${ans.marksAwarded || 0}/${ans.marks || 1}</p>
            </div>
            <div class="p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <p class="text-slate-500">Difficulty</p>
              <p class="font-bold capitalize text-white">${esc(ans.difficulty || 'Medium')}</p>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5 mb-2">
            <p class="text-xs font-semibold text-slate-300 mb-1">Explanation</p>
            <p class="text-xs text-slate-400 leading-relaxed">${esc(explanation)}</p>
          </div>

          ${ans.mistakeReason ? `
            <div class="p-2.5 rounded-lg bg-red-500/[0.08] border border-red-500/20 flex items-start gap-2">
              <span class="text-red-400 text-xs shrink-0">💡</span>
              <div>
                <p class="text-[11px] font-bold text-red-300">Mistake Insight</p>
                <p class="text-xs text-red-200/90 leading-relaxed">${esc(ans.mistakeReason)}</p>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  window.downloadPdfReport = async function (wrongOnly = false) {
    if (!currentAttemptId) {
      alert('No test selected for download');
      return;
    }
    try {
      await API.tests.downloadPdf(currentAttemptId, wrongOnly);
    } catch (err) {
      console.error('downloadPdfReport error:', err);
      alert(err.message || 'Failed to download report PDF');
    }
  };

  function renderRecentResultCard(r, idx) {
    const score = r.score || {};
    const ai = r.aiAnalysis || {};
    const percentage = score.percentage || 0;
    const level = ai.performanceLevel || 'Average';
    const badgeClass = getPerformanceBadgeClass(level);

    const date = r.finishedAt ? new Date(r.finishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const duration = formatDuration(r.durationMs);

    return `
      <a href="test-results.html?attemptId=${r.attemptId}" class="block p-4 rounded-xl nx-card border-white/[0.06] hover:border-cyan-500/30 transition-all group">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">${esc(r.subjectName || r.subjectCode)}</h4>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass} shrink-0">${level}</span>
            </div>
            <p class="text-xs text-slate-400 truncate">${esc(r.chapterTitle || (r.chapterNumber ? 'Chapter ' + r.chapterNumber : 'Full Paper'))}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-xl font-black ${percentage >= 75 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-red-400'}">${percentage}%</p>
            <p class="text-[10px] text-slate-500">${date} • ${duration}</p>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
          <span class="text-slate-400">${score.correct || 0} correct • ${score.incorrect || 0} incorrect • ${score.skipped || 0} skipped</span>
          <span class="text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">View Details →</span>
        </div>
      </a>
    `;
  }

  function getPerformanceBadgeClass(level) {
    switch (level) {
      case 'Excellent': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Good': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Average': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Needs Improvement': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  }

  function formatDuration(ms) {
    if (!ms || ms < 1000) return '—';
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  function renderError(message) {
    const resultView = $('resultView');
    if (resultView) {
      resultView.innerHTML = `
        <div class="p-8 text-center nx-card">
          <div class="w-14 h-14 rounded-2xl bg-red-500/15 text-red-400 border border-red-500/25 flex items-center justify-center text-2xl mx-auto mb-4">⚠️</div>
          <p class="text-sm font-bold text-white mb-1">Unable to Load Result</p>
          <p class="text-xs text-slate-400 mb-4">${esc(message)}</p>
          <a href="test-results.html" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 text-ink-950 font-bold text-xs hover:bg-cyan-400 transition">
            View All Results
          </a>
        </div>
      `;
    }
  }

  // Filter function for answer review
  window.filterAnswers = function (filter) {
    currentFilter = filter;
    document.querySelectorAll('.answer-filter-btn').forEach(btn => {
      const isActive = btn.getAttribute('data-filter') === filter;
      btn.classList.toggle('bg-white/[0.06]', isActive);
      btn.classList.toggle('border-cyan-500/40', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('bg-white/[0.03]', !isActive);
      btn.classList.toggle('border-white/5', !isActive);
      btn.classList.toggle('text-slate-400', !isActive);
    });

    document.querySelectorAll('[data-filter]').forEach(card => {
      const cardFilter = card.getAttribute('data-filter');
      const show = filter === 'all' || cardFilter === filter;
      card.style.display = show ? 'block' : 'none';
    });
  };

  document.addEventListener('DOMContentLoaded', init);
})();