/**
 * DIGITAL BOARD EXAM ENGINE — Nexus
 * Merged logic for MCQ Test + Subjective Answer Sheet Upload
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // =========================================
  // STATE VARIABLES
  // =========================================
  // MCQ Variables
  let attemptId = null;
  let questions = [];
  let currentIndex = 0;
  let answersMap = {}; 
  let timerSeconds = 0;
  let timerInterval = null;
  let questionStartTime = 0;
  let testMeta = {};

  // Subjective Upload Variables
  let uploadedPages = []; 
  let activeSubmissionId = null;
  let pollingInterval = null;

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

  /* ── Tab Switching (MCQ vs Subjective) ── */
  window.switchExamTab = function (tabId) {
    const btnMcq = $('tabBtn-mcq');
    const btnSub = $('tabBtn-subjective');
    const secMcq = $('section-mcq');
    const secSub = $('section-subjective');

    if (tabId === 'mcq') {
      secMcq.classList.remove('hidden');
      secMcq.classList.add('flex');
      secSub.classList.add('hidden');
      
      btnMcq.className = 'px-4 py-2 rounded-t-lg text-sm font-bold bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400 transition-all';
      btnSub.className = 'px-4 py-2 rounded-t-lg text-sm font-semibold text-slate-400 hover:text-white transition-all flex items-center gap-2';
    } else {
      secMcq.classList.add('hidden');
      secMcq.classList.remove('flex');
      secSub.classList.remove('hidden');
      
      btnMcq.className = 'px-4 py-2 rounded-t-lg text-sm font-semibold text-slate-400 hover:text-white transition-all';
      btnSub.className = 'px-4 py-2 rounded-t-lg text-sm font-bold bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400 transition-all flex items-center gap-2';
    }
  };

  /* ── Render Subjective Questions ── */
  function renderSubjectiveQuestions(sqList) {
    const container = $('subjectiveQuestionsList');
    if (!container) return;

    if (!sqList || sqList.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500">No subjective questions available for this paper.</p>';
      return;
    }

    container.innerHTML = sqList.map((sq, idx) => `
      <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 mb-3 hover:border-white/10 transition">
        <div class="flex justify-between items-start mb-2">
          <span class="font-bold text-cyan-400 text-sm">Q.${sq.questionNumber || (idx + 1)}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">${sq.marks || 5} Marks</span>
        </div>
        <p class="text-sm font-medium text-white leading-relaxed">${esc(sq.questionText)}</p>
        ${sq.hindiQuestionText ? `<p class="text-xs text-slate-400 mt-1">${esc(sq.hindiQuestionText)}</p>` : ''}
      </div>
    `).join('');
  }

  /* ── Question Navigation Dots (MCQ) ── */
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

  /* ── Render MCQ Question ── */
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

    // Options
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

    // Navigation buttons
    const prevBtn = $('prevBtn');
    if (prevBtn) prevBtn.disabled = currentIndex === 0;

    const nextBtn = $('nextBtn');
    if (nextBtn) {
      if (currentIndex === questions.length - 1) {
        nextBtn.innerHTML = 'Finish MCQ 🏁';
        nextBtn.onclick = () => switchExamTab('subjective'); // Auto redirect to subjective
      } else {
        nextBtn.innerHTML = 'Save & Next';
        nextBtn.onclick = () => navigateQuestion(1);
      }
    }

    renderNavigationDots();
    updateStats();
  }

  /* ── Option Selection ── */
  window.selectOption = async function (key) {
    const q = questions[currentIndex];
    if (!q || answersMap[q.id]) return; 

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
      switchExamTab('subjective');
    }
  };


  /* =========================================
     SUBJECTIVE UPLOAD LOGIC
     ========================================= */
  function setupDropZone() {
    const dropZone = $('dropZone');
    const fileInput = $('fileInput');
    const cameraInput = $('cameraInput');

    if (dropZone) {
      ['dragenter', 'dragover'].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          dropZone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          dropZone.classList.remove('dragover');
        });
      });
      dropZone.addEventListener('drop', (e) => handleFilesSelected(e.dataTransfer.files));
    }
    if (fileInput) fileInput.addEventListener('change', (e) => { handleFilesSelected(e.target.files); fileInput.value = ''; });
    if (cameraInput) cameraInput.addEventListener('change', (e) => { handleFilesSelected(e.target.files); cameraInput.value = ''; });
  }

  function handleFilesSelected(files) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('Please select image files (JPG, PNG, WEBP) or PDFs');
        return;
      }
      if (uploadedPages.length >= 20) {
        alert('Maximum 20 pages allowed');
        return;
      }

      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          uploadedPages.push({
            id: 'page_' + Date.now(),
            base64: dataUrl.split(',')[1],
            mimeType: file.type,
            previewUrl: dataUrl,
          });
          renderPagesGrid();
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_WIDTH = 1600;
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            uploadedPages.push({
              id: 'page_' + Date.now(),
              base64: compressedDataUrl.split(',')[1],
              mimeType: 'image/jpeg',
              previewUrl: compressedDataUrl,
            });
            renderPagesGrid();
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  function renderPagesGrid() {
    const container = $('pagesGridContainer');
    const grid = $('pagesGrid');
    const badge = $('pageCountBadge');
    const submitBtn = $('submitEvalBtn');

    if (!container || !grid) return;

    if (uploadedPages.length === 0) {
      container.classList.add('hidden');
      if (badge) badge.textContent = '0 pages added';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    container.classList.remove('hidden');
    if (badge) badge.textContent = `${uploadedPages.length} pages added`;
    if (submitBtn) submitBtn.disabled = false;

    grid.innerHTML = uploadedPages.map((p, idx) => {
      const isPdf = p.mimeType === 'application/pdf';
      const previewContent = isPdf 
        ? `<div class="flex flex-col items-center justify-center text-rose-400"><svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg><span class="text-[9px] font-bold">PDF</span></div>`
        : `<img src="${p.previewUrl}" alt="Page ${idx + 1}" class="w-full h-full object-cover">`;

      return `
        <div class="page-thumb relative rounded-xl overflow-hidden border border-white/10 bg-black/40 group aspect-[3/4]">
          <div class="w-full h-full flex items-center justify-center bg-ink-950">${previewContent}</div>
          <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-cyan-300 border border-white/10">Page ${idx + 1}</span>
          <button onclick="removePage(${idx})" class="absolute top-2 right-2 w-6 h-6 rounded bg-red-500/80 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">✕</button>
        </div>
      `;
    }).join('');
  }

  window.removePage = function (idx) {
    uploadedPages.splice(idx, 1);
    renderPagesGrid();
  };

  window.submitSubjectiveSheet = async function () {
    if (uploadedPages.length === 0) return alert('Please add at least one page');

    const submitBtn = $('submitEvalBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Uploading...</span>';
    $('cubeLoadingOverlay')?.classList.add('active');

    try {
      const payload = {
        attemptId: attemptId, 
        boardCode: testMeta.boardCode || 'bseb',
        classLevel: testMeta.classLevel || '10',
        subjectCode: testMeta.subjectCode,
        subjectName: testMeta.subjectName,
        medium: testMeta.medium || 'Hindi',
        paperId: testMeta.paperId || null,
        paperCode: testMeta.paperCode || '',
        year: testMeta.year || null,
        examPhase: testMeta.examPhase || '',
        setCode: testMeta.setCode || '',
        pages: uploadedPages.map((p, idx) => ({
          pageNumber: idx + 1,
          imageBase64: p.base64,
          mimeType: p.mimeType,
        })),
      };

      const res = await API.subjective.uploadSheet(payload);
      if (!res.success || !res.submissionId) throw new Error(res.error || 'Upload failed');

      activeSubmissionId = res.submissionId;
      
      submitBtn.innerHTML = '<span>⏳ AI Evaluating...</span>';
      startEvaluationPolling(activeSubmissionId);

    } catch (err) {
      alert(err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀 Upload & Evaluate</span>';
    } finally {
      $('cubeLoadingOverlay')?.classList.remove('active');
    }
  };

  function startEvaluationPolling(submissionId) {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
      try {
        const res = await API.subjective.getStatus(submissionId);
        if (!res.success) return;
        
        if (res.status === 'completed') {
          clearInterval(pollingInterval);
          pollingInterval = null;
          $('submitEvalBtn').innerHTML = '<span>✅ Evaluation Complete</span>';
          $('subjectiveUploadStatus').classList.remove('hidden');
          $('finishModalSubjectiveStatus').textContent = 'Subjective Sheet: Evaluated ✅';
        } else if (res.status === 'failed') {
          clearInterval(pollingInterval);
          pollingInterval = null;
          alert('Evaluation failed. Please try again.');
          $('submitEvalBtn').disabled = false;
          $('submitEvalBtn').innerHTML = '<span>🚀 Upload & Evaluate</span>';
        }
      } catch (e) { console.error(e); }
    }, 3000);
  }


  /* =========================================
     FINISH EXAM LOGIC
     ========================================= */
  window.handleFinishTest = function () {
    const answered = Object.keys(answersMap).length;
    const total = questions.length;
    const unanswered = total - answered;

    const statsEl = $('finishModalStats');
    if (statsEl) statsEl.textContent = `You answered ${answered} of ${total} MCQs.`;

    const subStatus = $('finishModalSubjectiveStatus');
    if (subStatus) {
      if (activeSubmissionId) {
        subStatus.textContent = 'Subjective Sheet: Uploaded ✅';
        subStatus.className = 'text-emerald-400 font-semibold';
      } else {
        subStatus.textContent = 'Subjective Sheet: Not Uploaded ⚠️';
        subStatus.className = 'text-amber-400 font-semibold';
      }
    }

    $('finishModal')?.classList.remove('hidden');
  };

  window.closeFinishModal = function () {
    $('finishModal')?.classList.add('hidden');
  };

  window.confirmFinishTest = async function () {
    const finishBtn = $('finishBtn');
    if (finishBtn) {
      finishBtn.disabled = true;
      finishBtn.textContent = 'Submitting...';
    }

    try {
      stopTimer();
      const res = await API.tests.finishTest(attemptId, { 
        subjectiveSubmissionId: activeSubmissionId 
      });

      if (res.success) {
        window.location.href = `test-results.html?attemptId=${encodeURIComponent(attemptId)}`;
      }
    } catch (err) {
      console.error('finishTest error:', err);
      alert(err.message || 'Failed to submit test');
      if (finishBtn) {
        finishBtn.disabled = false;
        finishBtn.textContent = 'Finish Exam';
      }
      startTimer();
    }
  };


  /* =========================================
     INITIALIZATION
     ========================================= */
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
        // 🚨 AI Trigger & Progress Loading Logic
        const loadingText = $('loadingState').querySelector('p');
        if (loadingText) loadingText.innerHTML = "Preparing questions as per Board Pattern...";

        let prepRes = await API.tests.prepareChapterQuestions({
          subjectCode,
          chapterNumber: Number(chapterNumber),
          isHardMode: isHard,
        });

        if (!prepRes.ready) {
          let attempts = 0;
          const MAX_ATTEMPTS = 240; // 20 minutes (240 * 5 sec)

          while (!prepRes.ready && attempts < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 5000));
            attempts++;
            
            if (loadingText) {
              loadingText.innerHTML = `
                <span class="text-cyan-400 font-bold text-lg block mb-2">${prepRes.progressPercent || 0}%</span>
                <span class="text-sm block">${prepRes.progressMessage || 'Generating questions...'}</span>
                <span class="text-[10px] text-slate-500 block mt-2">Please do not close or refresh this page.</span>
              `;
            }

            try {
              prepRes = await API.tests.prepareChapterQuestions({
                subjectCode,
                chapterNumber: Number(chapterNumber),
                isHardMode: isHard,
              });
            } catch (e) {
              console.warn('Network glitch, retrying...', e);
            }
          }

          if (!prepRes.ready) {
            throw new Error('Question generation timed out. Please try again.');
          }
        }

        // Ab test start karo jab ready ho jaye
        res = await API.tests.startTest({
          subjectCode,
          chapterNumber: chapterNumber ? Number(chapterNumber) : undefined,
          isHardMode: isHard,
          questionLimit: 100, 
        });
      }

      const hasMcq = res.questions && res.questions.length > 0;
      const hasSub = res.subjectiveQuestions && res.subjectiveQuestions.length > 0;

      if (!res.success || (!hasMcq && !hasSub)) {
        alert('No questions available for this selection.');
        window.location.href = 'test-select.html';
        return;
      }

      attemptId = res.attemptId;
      questions = (res.questions || []).map(q => ({ ...q, subjectCode: subjectCode || res.subjectCode }));
      
      testMeta = {
        testType: res.testType || (paperId ? 'full_paper' : 'chapter_practice'),
        subjectName: res.subjectName,
        chapterTitle: res.chapterTitle,
        medium: res.medium,
        subjectCode: subjectCode || res.subjectCode,
        paperCode: res.paperCode || '',
        year: res.year,
        examPhase: res.examPhase,
        setCode: res.setCode,
        boardCode: res.boardCode,
        classLevel: res.classLevel,
        paperId: paperId,
        sourceCreditText: res.sourceCreditText || '',
      };

      $('testTitle').textContent = res.paperCode || res.chapterTitle || 'Digital Board Exam';
      $('testSubtitle').textContent = `${res.subjectName} • ${res.medium}`;

      if (hasSub) {
        renderSubjectiveQuestions(res.subjectiveQuestions);
      } else {
        $('tabBtn-subjective').style.display = 'none';
      }

      if (!hasMcq && hasSub) {
        switchExamTab('subjective');
      }

      setupDropZone();

      $('loadingState')?.classList.add('hidden');
      const testUI = $('testUI');
      if (testUI) {
        testUI.classList.remove('hidden');
        testUI.classList.add('flex');
      }

      startTimer();
      
      if (hasMcq) renderQuestion();
      updateStats();

    } catch (err) {
      console.error('Test init error:', err);
      alert(err.message || 'Failed to start test session');
      window.location.href = 'test-select.html';
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  window.addEventListener('beforeunload', (e) => {
    if (attemptId && (Object.keys(answersMap).length > 0 || uploadedPages.length > 0)) {
      e.preventDefault();
      e.returnValue = 'Your exam progress may be lost. Are you sure you want to leave?';
    }
  });
})();