(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let currentAttemptId = null;
  let allHistoryResults = [];
  let currentResultData = null; 
  let resultPollTimer = null;

  async function init() {
    if (!API.Token.exists()) { window.location.href = 'auth.html'; return; }

    const params = new URLSearchParams(window.location.search);
    currentAttemptId = params.get('attemptId');

    try {
      const historyRes = await API.tests.getRecentResults(20);
      allHistoryResults = historyRes.results || [];
      
      let latestResult = null;
      const targetAttemptId = currentAttemptId || allHistoryResults[0]?.attemptId;
      let pendingResult = null;
      if (targetAttemptId) {
        currentAttemptId = targetAttemptId;
        const singleRes = await API.tests.getResult(targetAttemptId);
        if (singleRes.resultAvailable) latestResult = singleRes.result;
        else pendingResult = singleRes;
      }

      $('loadingResults').classList.add('hidden');
      $('resultsContainer').classList.remove('hidden');

      if (latestResult) {
        currentResultData = latestResult;
        renderLatestResult(latestResult);
      } else if (pendingResult) {
        renderPendingResult(pendingResult);
      } else {
        $('latestResultSection').innerHTML = '<p class="text-center text-slate-500 py-10">No recent result found. Take a test to see your analysis!</p>';
      }

      renderHistory(allHistoryResults);
      if (pendingResult) startResultPolling();

    } catch (err) {
      console.error('Init error:', err);
      $('loadingResults').innerHTML = `<p class="text-red-400">Error loading results: ${err.message}</p>`;
    }
  }

  function renderPendingResult(state) {
    const pending = $('resultPending');
    pending.classList.remove('hidden');
    $('resultPendingTitle').textContent = state.subjectiveStatus === 'awaiting_upload'
      ? 'Answer-sheet upload is still open'
      : state.subjectiveStatus === 'review_required'
        ? 'Answer sheet needs review'
        : state.subjectiveStatus === 'failed'
          ? 'Answer-sheet evaluation needs attention'
          : 'Result is being prepared';
    const releaseTime = state.resultReleaseAt
      ? new Date(state.resultReleaseAt).toLocaleString('en-IN')
      : 'after evaluation is complete';
    $('resultPendingMessage').textContent = state.message || `Your result will be available after evaluation and at or after ${releaseTime}. This page will check for updates automatically.`;
    const uploadLink = $('uploadPendingSheetLink');
    const canOpenExam = ['awaiting_upload', 'failed', 'review_required', 'evaluation_missing'].includes(state.subjectiveStatus);
    uploadLink.textContent = state.subjectiveStatus === 'awaiting_upload'
      ? 'Open answer-sheet upload'
      : state.subjectiveStatus === 'failed'
        ? 'Retry answer-sheet evaluation'
        : state.subjectiveStatus === 'review_required'
          ? 'Correct and re-upload answer sheet'
        : 'Re-upload answer sheet';
    uploadLink.classList.toggle('hidden', !canOpenExam);
    if (canOpenExam) uploadLink.href = `test-live.html?attemptId=${encodeURIComponent(currentAttemptId)}`;
  }

  function startResultPolling() {
    if (resultPollTimer) return;
    resultPollTimer = window.setInterval(async () => {
      try {
        const response = await API.tests.getResult(currentAttemptId);
        if (response.resultAvailable && response.result) {
          window.clearInterval(resultPollTimer);
          resultPollTimer = null;
          currentResultData = response.result;
          $('resultPending').classList.add('hidden');
          renderLatestResult(response.result);
          const historyResponse = await API.tests.getRecentResults(20);
          allHistoryResults = historyResponse.results || [];
          renderHistory(allHistoryResults);
        } else {
          renderPendingResult(response);
        }
      } catch (error) {
        console.error('Result refresh failed:', error);
      }
    }, 30000);
  }

  // =========================================
  // RENDER LATEST RESULT
  // =========================================
  function renderLatestResult(result) {
    const score = result.combinedScore || result.score || {}; // Use combined score if available
    const mcqScore = result.score || {};
    const subjScore = result.subjectiveScore || {};
    const ai = result.aiAnalysis || {};
    const pct = score.percentage || 0;

    // 1. Subject & Chapter
    $('resultSubject').textContent = result.subjectName || result.subjectCode;
    $('resultChapter').textContent = result.chapterTitle || (result.chapterNumber ? `Chapter ${result.chapterNumber}` : 'Full Board Paper');

    // 2. Score Ring (Combined)
    const ring = $('scoreRing');
    const circumference = 2 * Math.PI * 15.9155;
    const offset = circumference * (1 - pct / 100);
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    ring.style.strokeDashoffset = offset;
    $('scorePercent').textContent = `${pct}%`;
    $('scoreLabel').textContent = `${score.obtainedMarks || 0} / ${score.totalMarks || 0}`;

    // 3. Performance Badge
    const badge = $('performanceBadge');
    badge.textContent = ai.performanceLevel || 'Average';
    if (pct >= 75) badge.className = 'inline-flex px-4 py-1.5 rounded-full text-xs font-bold border bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    else if (pct >= 50) badge.className = 'inline-flex px-4 py-1.5 rounded-full text-xs font-bold border bg-blue-500/20 text-blue-400 border-blue-500/30';
    else badge.className = 'inline-flex px-4 py-1.5 rounded-full text-xs font-bold border bg-red-500/20 text-red-400 border-red-500/30';

    // 4. Score Breakdown
    $('rMcqScore').textContent = `${mcqScore.obtainedMarks || 0}/${mcqScore.totalMarks || 0}`;
    $('rSubjScore').textContent = subjScore.totalMarks > 0 ? `${subjScore.obtainedMarks}/${subjScore.totalMarks}` : `N/A`;
    $('rCorrect').textContent = mcqScore.correct || 0;
    $('rIncorrect').textContent = mcqScore.incorrect || 0;

    // 5. Time Analysis
    const durMin = Math.round((result.durationMs || 0) / 60000);
    $('rTimeTaken').textContent = `${durMin}m`;
    $('rAvgTime').textContent = `${Math.round(durMin / (result.totalQuestions || 1))}m`;
    $('rTimeSaved').textContent = `${Math.max(0, 180 - durMin)}m`;

    // 6. PDF Card (Show if subjective was submitted)
    if (result.subjectiveDetails) {
      $('pdfCard').classList.remove('hidden');
      $('pdfFileName').textContent = `${result.subjectName || 'Board'}_AnswerSheet.pdf`;
    } else {
      $('pdfCard').classList.add('hidden');
    }

    // 7. AI Analysis
    $('aiRemark').textContent = ai.overallRemark || 'Analysis not available.';
    const renderList = (id, items, fallback) => {
      const el = $(id);
      if (!items || items.length === 0) el.innerHTML = `<li>${fallback}</li>`;
      else el.innerHTML = items.map(i => `<li>• ${esc(i)}</li>`).join('');
    };
    renderList('aiStrengths', ai.strengths, 'Keep practicing!');
    renderList('aiWeakAreas', ai.weakAreas, 'No major weak areas.');
    renderList('aiRecommendations', ai.recommendations, 'Continue your pace.');

    // 8. Subjective Evaluation Section
    if (result.subjectiveDetails && result.subjectiveDetails.evaluations && result.subjectiveDetails.evaluations.length > 0) {
      $('subjectiveEvalSection').classList.remove('hidden');
      const subjList = $('subjectiveQuestionsList');
      
      subjList.innerHTML = result.subjectiveDetails.evaluations.map((q, idx) => {
        const steps = q.stepMarksBreakdown || [];
        const covered = q.keywordsCovered || [];
        const missed = q.keywordsMissed || [];
        const isGood = q.awardedMarks >= q.maxMarks * 0.7;

        return `
          <div class="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-2.5">
                <span class="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">Q${q.questionNumber || idx+1}</span>
                <div>
                  <h5 class="text-xs sm:text-sm font-bold text-white">${esc(q.questionText)}</h5>
                  ${q.hindiQuestionText && q.hindiQuestionText !== q.questionText ? `<p class="text-xs text-slate-400 mt-0.5">${esc(q.hindiQuestionText)}</p>` : ''}
                </div>
              </div>
              <span class="px-2.5 py-1 rounded-full text-xs font-black ${isGood ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'} shrink-0">
                ${q.awardedMarks}/${q.maxMarks} Marks
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-xs">
              <div class="p-3 rounded-xl bg-ink-950/60 border border-white/5">
                <p class="text-[11px] font-bold text-cyan-300 mb-1 flex items-center gap-1"><span>✍️</span> Your Answer</p>
                <p class="text-slate-300 leading-relaxed font-mono text-[11px]">${esc(q.studentAnswer || 'Not found')}</p>
              </div>
              <div class="p-3 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10">
                <p class="text-[11px] font-bold text-emerald-300 mb-1 flex items-center gap-1"><span>🏛️</span> Official Model Answer</p>
                <p class="text-slate-300 leading-relaxed text-[11px]">${esc(q.modelAnswer || 'Standard solution')}</p>
              </div>
            </div>

            ${steps.length > 0 ? `
              <div class="mb-3 overflow-x-auto">
                <table class="w-full text-left text-xs border border-white/5 rounded-xl overflow-hidden">
                  <thead class="bg-white/[0.03] text-slate-400 text-[10px] uppercase font-bold">
                    <tr><th class="p-2">Marking Step</th><th class="p-2 w-20">Max</th><th class="p-2 w-20">Awarded</th><th class="p-2">Comment</th></tr>
                  </thead>
                  <tbody class="divide-y divide-white/5 text-slate-300">
                    ${steps.map((st) => `
                      <tr>
                        <td class="p-2 font-medium">${esc(st.step)}</td>
                        <td class="p-2 text-slate-400">${st.marks}</td>
                        <td class="p-2 font-bold text-emerald-400">${st.awarded}</td>
                        <td class="p-2 text-slate-400 text-[11px]">${esc(st.comment || 'Satisfactory')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-300">
              <span class="font-bold text-cyan-400">Teacher Note:</span> ${esc(q.feedback || q.examinerRemarks || 'Good attempt.')}
            </div>
          </div>
        `;
      }).join('');
    } else {
      $('subjectiveEvalSection').classList.add('hidden');
    }

    // 9. MCQ Answer Review
    const answersList = $('answersReviewList');
    if (result.answers && result.answers.length > 0) {
      answersList.innerHTML = result.answers.map((ans, idx) => {
        if (ans.isSkipped) return ''; 
        const isCorrect = ans.isCorrect;
        const bg = isCorrect ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20';
        const status = isCorrect ? '<span class="text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20">Correct</span>' : '<span class="text-red-400 text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20">Incorrect</span>';
        
        return `
          <div class="p-4 rounded-xl border ${bg} mb-3">
            <div class="flex justify-between items-start mb-2">
              <p class="text-sm font-semibold text-white">${idx + 1}. ${esc(ans.questionText)}</p>
              ${status}
            </div>
            <p class="text-xs text-slate-400 mb-2">Your Answer: <span class="${isCorrect ? 'text-emerald-400' : 'text-red-400'}">${ans.selectedOption || 'Skipped'}</span> | Correct: <span class="text-emerald-400">${ans.correctOption}</span></p>
            ${ans.explanation ? `<div class="p-2 rounded-lg bg-white/5 text-xs text-slate-300"><b>Explanation:</b> ${esc(ans.explanation)}</div>` : ''}
          </div>
        `;
      }).join('');
    } else {
      answersList.innerHTML = '<p class="text-sm text-slate-500">No MCQ answers found.</p>';
    }
  }

  // =========================================
  // RENDER HISTORY TABLE
  // =========================================
  function renderHistory(results) {
    const list = $('historyList');
    if (results.length === 0) {
      list.innerHTML = '<p class="p-6 text-center text-sm text-slate-500">No past results found.</p>';
      return;
    }

    list.innerHTML = results.map(r => {
      const isFull = r.testType === 'full_paper';
      const pct = r.combinedScore ? r.combinedScore.percentage : (r.score?.percentage || 0);
      const color = pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
      const date = new Date(r.finishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      
      const icon = isFull ? '📄' : '📝';
      const typeLabel = isFull ? 'Full Paper' : 'Chapter Test';
      
      return `
        <div class="history-row grid grid-cols-1 sm:grid-cols-12 gap-4 px-6 py-4 items-center group" data-type="${isFull ? 'full' : 'chapter'}">
          <div class="col-span-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg">${icon}</div>
            <div>
              <p class="text-sm font-bold text-white group-hover:text-cyan-300 transition">${esc(r.subjectName || r.subjectCode)}</p>
              <p class="text-[11px] text-slate-500">${typeLabel}</p>
            </div>
          </div>
          <div class="col-span-2 text-center hidden sm:block">
            <span class="px-2 py-1 rounded-md bg-white/5 text-slate-300 text-[10px] font-bold">${r.resultAvailable ? 'Completed' : 'Processing'}</span>
          </div>
          <div class="col-span-2 text-center text-[11px] text-slate-400 hidden sm:block">${date}</div>
          <div class="col-span-2 text-center">
            <span class="text-sm font-black ${r.resultAvailable ? color : 'text-slate-400'}">${r.resultAvailable ? `${pct}%` : 'Pending'}</span>
          </div>
          <div class="col-span-2 flex justify-end gap-2">
            <a href="test-results.html?attemptId=${r.attemptId}" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/20 text-slate-300 flex items-center justify-center border border-white/10 transition" title="View">👁️</a>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================
  // ACTIONS & UTILS
  // =========================================
  window.shareResult = function() {
    if (navigator.share) {
      navigator.share({ title: 'My Nexus Result', text: 'Check out my score!', url: window.location.href }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('📋 Link copied to clipboard!');
    }
  };

  // REAL PDF DOWNLOAD LOGIC (ROUTE FIXED)
  window.downloadPdf = async function() {
    if (!currentAttemptId) {
      showToast('⚠️ No active attempt to download.');
      return;
    }
    showToast('⏳ Generating PDF Report...');
    
    try {
      const token = (typeof API !== 'undefined' && API.Token.get) ? API.Token.get() : localStorage.getItem('nexus_token'); 
      
      const res = await fetch(`${API.base}/api/tests/${currentAttemptId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Server rejected PDF request');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Nexus_Report_${currentAttemptId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      showToast('✅ PDF Downloaded Successfully!');
    } catch (err) {
      console.error('PDF Error:', err);
      alert(`❌ Could not download PDF: ${err.message}`);
    }
  };

  window.retakeTest = function() {
    if (!currentResultData) return;
    
    if (currentResultData.testType === 'full_paper' && currentResultData.paperId) {
      window.location.href = `test-live.html?paperId=${currentResultData.paperId}&subject=${currentResultData.subjectCode}`;
    } else if (currentResultData.chapterNumber) {
      window.location.href = `test-live.html?subject=${currentResultData.subjectCode}&chapter=${currentResultData.chapterNumber}`;
    } else {
      window.location.href = 'test-select.html';
    }
  };

  window.filterHistory = function(type, btn) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.history-row').forEach(row => {
      row.style.display = (type === 'all' || row.getAttribute('data-type') === type) ? 'grid' : 'none';
    });
  };

  window.searchHistory = function() {
    const query = $('historySearch').value.toLowerCase();
    document.querySelectorAll('.history-row').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? 'grid' : 'none';
    });
  };

  function showToast(msg) {
    const t = $('toast');
    if(!t) return;
    t.textContent = msg;
    t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)'; }, 3000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();