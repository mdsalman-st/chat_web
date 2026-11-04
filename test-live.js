(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let attemptId = null;
  let questions = [];
  let currentIndex = 0;
  let answersMap = {}; 
  let timerSeconds = 0;
  let timerInterval = null;
  let questionStartTime = 0;
  let testMeta = {};

  /* ── Timer ── */
  function startTimer() {
    timerInterval = setInterval(() => {
      timerSeconds++;
      const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
      const secs = String(timerSeconds % 60).padStart(2, '0');
      const el = $('timerDisplay');
      if (el) el.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
  }

  /* ── Question Navigation Dots ── */
  function renderNavigationDots() {
    const nav = $('questionNav');
    if (!nav) return;

    nav.innerHTML = questions.map((q, idx) => {
      const ans = answersMap[q.id];
      let cls = 'q-dot skipped';
      if (idx === currentIndex) {
        cls = 'q-dot current';
      } else if (ans) {
        cls = ans.isCorrect ? 'q-dot answered-correct' : 'q-dot answered-incorrect';
      }
      return `<button onclick="goToQuestion(${idx})" class="${cls}">${idx + 1}</button>`;
    }).join('');
  }

  /* ── Update Stats ── */
  function updateStats() {
    let correct = 0, incorrect = 0;
    questions.forEach((q) => {
      const ans = answersMap[q.id];
      if (ans) {
        if (ans.isCorrect) correct++;
        else incorrect++;
      }
    });
    
    const skipped = questions.length - correct - incorrect;

    const el = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    el('statCorrect', correct);
    el('statIncorrect', incorrect);
    el('statSkipped', skipped);

    // Progress
    const answered = correct + incorrect;
    el('progressLabel', `${answered} / ${questions.length}`);
    const bar = $('progressBar');
    if (bar) bar.style.width = `${Math.round((answered / questions.length) * 100)}%`;
  }

  /* ── Render Question ── */
  function renderQuestion() {
    if (currentIndex < 0 || currentIndex >= questions.length) return;

    const q = questions[currentIndex];
    const ans = answersMap[q.id];
    const isAnswered = !!ans;

    questionStartTime = Date.now();

    // Header
    const qNum = $('qNumber');
    if (qNum) qNum.textContent = `Q.${currentIndex + 1}`;

    const qDiff = $('qDifficulty');
    if (qDiff) {
      qDiff.textContent = (q.difficulty || 'Medium').toUpperCase();
      qDiff.className = 'text-[10px] font-bold tracking-wider px-2 py-1 rounded border ';
      const d = (q.difficulty || 'Medium').toLowerCase();
      if (d === 'easy') qDiff.className += 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      else if (d === 'hard') qDiff.className += 'bg-red-500/10 text-red-400 border-red-500/20';
      else qDiff.className += 'bg-white/5 text-slate-300 border-white/10';
    }

    // Tag Badge (MVVI / VVI)
    const qTag = $('qTagBadge');
    if (qTag) {
      const isMvvi = q.isMVVI || q.mvviTag?.tag === 'MVVI';
      const isVvi = q.isVVI || q.mvviTag?.tag === 'VVI';
      if (isMvvi) {
        qTag.textContent = '🔥 VVI';
        qTag.className = 'text-[10px] font-bold tracking-wider px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20';
        qTag.classList.remove('hidden');
      } else if (isVvi) {
        qTag.textContent = '⭐ Important';
        qTag.className = 'text-[10px] font-bold tracking-wider px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
        qTag.classList.remove('hidden');
      } else {
        qTag.classList.add('hidden');
      }
    }

    const qMarks = $('qMarks');
    if (qMarks) qMarks.textContent = `+${q.marks || 1} Mark${(q.marks || 1) > 1 ? 's' : ''}`;

    // Question Text (EN + HI)
    const qText = $('qText');
    if (qText) qText.textContent = q.questionText || '';

    const qHindi = $('qHindiText');
    if (qHindi) {
      if (q.hindiQuestionText && q.hindiQuestionText !== q.questionText) {
        qHindi.textContent = q.hindiQuestionText;
        qHindi.classList.remove('hidden');
      } else {
        qHindi.textContent = '';
        qHindi.classList.add('hidden');
      }
    }

    // Options (Dual Language)
    const optContainer = $('optionsContainer');
    if (optContainer) {
      optContainer.innerHTML = (q.options || []).map((opt) => {
        let btnClass = 'option-btn w-full p-4 text-left flex gap-4';
        if (isAnswered) {
          btnClass += ' answered';
          if (opt.key === ans.correctOption) btnClass += ' correct';
          else if (opt.key === ans.selectedOption && !ans.isCorrect) btnClass += ' incorrect';
        }

        return `
          <button onclick="selectOption('${opt.key}')" class="${btnClass}" ${isAnswered ? 'disabled' : ''}>
            <div class="opt-key w-6 h-6 rounded bg-white/5 border border-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors">${esc(opt.key)}</div>
            <div>
              <p class="text-sm font-medium text-white leading-snug">${esc(opt.text)}</p>
              ${opt.hindiText ? `<p class="text-[12px] text-slate-400 mt-1 leading-snug">${esc(opt.hindiText)}</p>` : ''}
            </div>
          </button>
        `;
      }).join('');
    }

    // Feedback
    const fbArea = $('feedbackArea');
    if (fbArea) {
      if (isAnswered && ans.explanation) {
        fbArea.classList.remove('hidden');
        const fbCard = $('feedbackCard');
        const fbIcon = $('feedbackIcon');
        const fbTitle = $('feedbackTitle');
        const fbExp = $('feedbackExplanation');

        if (ans.isCorrect) {
          fbCard.className = 'p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 animate-[fadeIn_0.3s_ease]';
          if (fbIcon) { fbIcon.textContent = '✅'; fbIcon.className = 'text-emerald-400 text-lg'; }
          if (fbTitle) { fbTitle.textContent = 'Correct!'; fbTitle.className = 'text-sm font-bold text-emerald-400'; }
        } else {
          fbCard.className = 'p-4 rounded-xl border border-red-500/20 bg-red-500/5 animate-[fadeIn_0.3s_ease]';
          if (fbIcon) { fbIcon.textContent = '❌'; fbIcon.className = 'text-red-400 text-lg'; }
          if (fbTitle) { fbTitle.textContent = `Incorrect — Correct answer: ${ans.correctOption}`; fbTitle.className = 'text-sm font-bold text-red-400'; }
        }
        if (fbExp) fbExp.textContent = ans.explanation;
      } else {
        fbArea.classList.add('hidden');
      }
    }

    // Source Attribution
    const qSource = $('qSourceAttribution');
    const qSourceText = $('qSourceText');
    if (qSource && qSourceText) {
      const credit = testMeta.sourceCreditText || q.sourceLabel;
      if (credit) {
        qSourceText.textContent = `Official Paper: ${credit}`;
        qSource.classList.remove('hidden');
      } else {
        qSource.classList.add('hidden');
      }
    }

    // Navigation buttons
    const prevBtn = $('prevBtn');
    if (prevBtn) prevBtn.disabled = currentIndex === 0;

    const nextBtn = $('nextBtn');
    if (nextBtn) {
      if (currentIndex === questions.length - 1) {
        nextBtn.innerHTML = 'Finish 🏁';
        nextBtn.onclick = () => handleFinishTest();
      } else {
        nextBtn.innerHTML = 'Save & Next';
        nextBtn.onclick = () => navigateQuestion(1);
      }
    }

    const skipBtn = $('skipBtn');
    if (skipBtn) {
      skipBtn.style.display = isAnswered ? 'none' : 'block';
    }

    renderNavigationDots();
    updateStats();
  }

  /* ── Option Selection ── */
  window.selectOption = async function (key) {
    const q = questions[currentIndex];
    if (!q || answersMap[q.id]) return; // Prevent double answer

    const timeTakenMs = Date.now() - questionStartTime;

    try {
      const res = await API.tests.submitAnswer(attemptId, {
        questionId: q.id,
        selectedOption: key,
        timeTakenMs,
      });

      answersMap[q.id] = {
        selectedOption: key,
        isCorrect: res.isCorrect,
        correctOption: res.correctOption || key,
        explanation: res.explanation || '',
      };

      renderQuestion();
    } catch (err) {
      console.error('submitAnswer error:', err);
      alert(err.message || 'Failed to submit answer');
    }
  };

  /* ── Navigation ── */
  window.navigateQuestion = function (dir) {
    const newIdx = currentIndex + dir;
    if (newIdx >= 0 && newIdx < questions.length) {
      currentIndex = newIdx;
      renderQuestion();
    }
  };

  window.goToQuestion = function (idx) {
    if (idx >= 0 && idx < questions.length) {
      currentIndex = idx;
      renderQuestion();
    }
  };

  window.skipQuestion = function () {
    if (currentIndex < questions.length - 1) {
      navigateQuestion(1);
    } else {
      handleFinishTest();
    }
  };

  /* ── Finish Test ── */
  window.handleFinishTest = function () {
    const answered = Object.keys(answersMap).length;
    const total = questions.length;
    const unanswered = total - answered;

    const statsEl = $('finishModalStats');
    if (statsEl) statsEl.textContent = `You answered ${answered} of ${total} questions.`;

    const warnEl = $('finishModalWarning');
    if (warnEl) {
      if (unanswered > 0) {
        warnEl.textContent = `⚠️ ${unanswered} question${unanswered > 1 ? 's' : ''} unanswered — they will be marked wrong.`;
      } else {
        warnEl.textContent = '✅ All questions answered!';
      }
    }

    const modal = $('finishModal');
    if (modal) modal.classList.remove('hidden');
  };

  window.closeFinishModal = function () {
    const modal = $('finishModal');
    if (modal) modal.classList.add('hidden');
  };

  window.confirmFinishTest = async function () {
    const modal = $('finishModal');
    const finishBtn = $('finishBtn');
    
    if (finishBtn) {
      finishBtn.disabled = true;
      finishBtn.textContent = 'Submitting...';
    }

    try {
      stopTimer();
      const res = await API.tests.finishTest(attemptId);

      if (res.success) {
        window.location.href = `test-results.html?attemptId=${encodeURIComponent(attemptId)}`;
      }
    } catch (err) {
      console.error('finishTest error:', err);
      alert(err.message || 'Failed to submit test');
      if (finishBtn) {
        finishBtn.disabled = false;
        finishBtn.textContent = 'Finish Test';
      }
      startTimer();
    }
  };

  /* ── Initialization ── */
  async function init() {
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const paperId = params.get('paperId');
    const subjectCode = params.get('subject');
    const chapterNumber = params.get('chapter');
    const isHard = params.get('hard') === '1';

    if (!paperId && !subjectCode) {
      alert('Missing subject or paper parameter');
      window.location.href = 'test-select.html';
      return;
    }

    try {
      let res;
      if (paperId) {
        res = await API.tests.startPaperTest(paperId, { isHardMode: isHard });
      } else {
        // Question limit set to 20
        res = await API.tests.startTest({
          subjectCode,
          chapterNumber: chapterNumber ? Number(chapterNumber) : undefined,
          isHardMode: isHard,
          questionLimit: 20, 
        });
      }

      if (!res.success || !res.questions || res.questions.length === 0) {
        alert('No questions available for this selection.');
        window.location.href = 'test-select.html';
        return;
      }

      attemptId = res.attemptId;
      questions = res.questions.map(q => ({ ...q, subjectCode: subjectCode || res.subjectCode }));
      testMeta = {
        testType: res.testType || (paperId ? 'full_paper' : 'chapter_practice'),
        subjectName: res.subjectName,
        chapterTitle: res.chapterTitle,
        totalQuestions: res.totalQuestions,
        medium: res.medium,
        subjectCode: subjectCode || res.subjectCode,
        sourceCreditText: res.sourceCreditText || '',
        paperCode: res.paperCode || '',
        year: res.year,
        examPhase: res.examPhase,
        setCode: res.setCode,
      };

      const titleEl = $('testTitle');
      if (titleEl) titleEl.textContent = res.paperCode || res.chapterTitle || 'Exam Test';

      const subtitleEl = $('testSubtitle');
      if (subtitleEl) {
        if (res.testType === 'full_paper') {
          subtitleEl.textContent = `${res.subjectName} • ${res.year} ${(res.examPhase || '').toUpperCase()}`;
        } else {
          subtitleEl.textContent = `${res.subjectName} • ${res.medium}`;
        }
      }

      // Hide Loading, Show UI
      $('loadingState')?.classList.add('hidden');
      const testUI = $('testUI');
      if (testUI) {
        testUI.classList.remove('hidden');
        testUI.classList.add('flex');
      }

      startTimer();
      renderQuestion();

    } catch (err) {
      console.error('Test init error:', err);
      alert(err.message || 'Failed to start test session');
      window.location.href = 'test-select.html';
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  window.addEventListener('beforeunload', (e) => {
    if (attemptId && Object.keys(answersMap).length > 0) {
      e.preventDefault();
      e.returnValue = 'Your test progress may be lost. Are you sure you want to leave?';
    }
  });
})();