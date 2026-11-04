/**
 * UPLOAD-SHEET.JS — Nexus Answer Sheet Upload & AI Handwriting Check Flow
 * Phase 6: Multi-page OCR, Gemini Vision transcription, and Board marking scheme evaluation.
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let currentProfile = {};
  let currentSubjectCode = null;
  let uploadedPages = []; // [{ id, file, base64, mimeType, previewUrl }]
  let activeSubmissionId = null;
  let pollingInterval = null;

  /* --------------------------------------------------------------------------
     INITIALIZATION
     -------------------------------------------------------------------------- */
  async function init() {
    if (!API.Token.exists()) {
      window.location.href = 'auth.html';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const urlSubmissionId = params.get('submissionId');

    try {
      // 1. Fetch Student Academic Profile
      const profRes = await API.tests.getProfile();
      currentProfile = profRes.profile || {};

      const badgeEl = $('academicBadgeLine');
      if (badgeEl) {
        badgeEl.textContent = currentProfile.formattedBadge || 'Class 10 • BSEB • Hindi';
      }

      // 2. Populate enrolled subjects
      const subjects = currentProfile.selectedSubjects || [];
      const tabsWrap = $('subjectTabs');

      if (subjects.length === 0) {
        if (tabsWrap) {
          tabsWrap.innerHTML = `
            <div class="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-xs text-amber-200">
              No subjects enrolled. Please configure subjects in <a href="settings.html" class="underline font-bold">Settings</a>.
            </div>
          `;
        }
        return;
      }

      currentSubjectCode = subjects[0].code;

      if (tabsWrap) {
        tabsWrap.innerHTML = subjects.map((sub, idx) => {
          const isSelected = sub.code === currentSubjectCode;
          return `
            <button onclick="selectSubject('${esc(sub.code)}')" data-code="${esc(sub.code)}"
                    class="subject-tab-btn flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                        : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20'
                    }">
              <span>${sub.icon || '📚'}</span>
              <span>${esc(sub.name)}</span>
            </button>
          `;
        }).join('');
      }

      await loadAvailablePapersForSubject();
      setupDropZone();
      loadRecentSubmissions();

      if (urlSubmissionId) {
        loadSubmissionResult(urlSubmissionId);
      }
    } catch (err) {
      console.error('Upload Sheet init error:', err);
    }
  }

  /* --------------------------------------------------------------------------
     SUBJECT SELECTION
     -------------------------------------------------------------------------- */
  window.selectSubject = async function (code) {
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

    await loadAvailablePapersForSubject();
  };

  async function loadAvailablePapersForSubject() {
    const selector = $('paperSelector');
    if (!selector || !currentSubjectCode) return;

    try {
      const res = await API.tests.getAvailablePapers(currentSubjectCode);
      const papers = res.papers || [];

      selector.innerHTML = `
        <option value="">General Subjective Test (Standard Syllabus Questions)</option>
        ${papers.map((p) => `
          <option value="${esc(p.paperId)}" data-code="${esc(p.paperCode)}" data-year="${p.year}" data-phase="${esc(p.examPhase)}" data-set="${esc(p.setCode || '')}">
            ${esc(p.paperCode)} — ${p.year} ${(p.examPhase || '').toUpperCase()}${p.setCode ? ` (Set ${p.setCode})` : ''}
          </option>
        `).join('')}
      `;
    } catch (err) {
      console.warn('Could not load papers for subject:', err);
    }
  }

  /* --------------------------------------------------------------------------
     DRAG & DROP / FILE HANDLERS
     -------------------------------------------------------------------------- */
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

      dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFilesSelected(files);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        handleFilesSelected(e.target.files);
        fileInput.value = '';
      });
    }

    if (cameraInput) {
      cameraInput.addEventListener('change', (e) => {
        handleFilesSelected(e.target.files);
        cameraInput.value = '';
      });
    }
  }

  function handleFilesSelected(files) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('Please select image files (JPG, PNG, WEBP) or PDFs');
        return;
      }

      if (uploadedPages.length >= 20) {
        alert('Maximum 20 pages allowed per submission');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const base64 = dataUrl.split(',')[1];
        uploadedPages.push({
          id: 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          file,
          base64,
          mimeType: file.type || 'image/jpeg',
          previewUrl: dataUrl,
        });

        renderPagesGrid();
      };
      reader.readAsDataURL(file);
    });
  }

  /* --------------------------------------------------------------------------
     PAGES GRID & REORDERING
     -------------------------------------------------------------------------- */
  function renderPagesGrid() {
    const container = $('pagesGridContainer');
    const grid = $('pagesGrid');
    const badge = $('pageCountBadge');
    const submitBtn = $('submitEvalBtn');
    const clearBtn = $('clearPagesBtn');

    if (!container || !grid) return;

    if (uploadedPages.length === 0) {
      container.classList.add('hidden');
      if (clearBtn) clearBtn.classList.add('hidden');
      if (badge) badge.textContent = '0 pages added';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    container.classList.remove('hidden');
    if (clearBtn) clearBtn.classList.remove('hidden');
    if (badge) badge.textContent = `${uploadedPages.length} page${uploadedPages.length > 1 ? 's' : ''} added`;
    if (submitBtn) submitBtn.disabled = false;

    grid.innerHTML = uploadedPages.map((p, idx) => `
      <div class="page-thumb relative rounded-xl overflow-hidden border border-white/10 bg-black/40 group">
        <div class="aspect-[3/4] overflow-hidden flex items-center justify-center bg-ink-950">
          <img src="${p.previewUrl}" alt="Page ${idx + 1}" class="w-full h-full object-cover">
        </div>

        <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-ink-950/80 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-white/10">
          Page ${idx + 1}
        </span>

        <button onclick="removePage(${idx})" title="Remove page" class="absolute top-2 right-2 w-6 h-6 rounded-md bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center text-xs transition opacity-0 group-hover:opacity-100 cursor-pointer">
          ✕
        </button>

        <div class="absolute bottom-2 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition">
          <button onclick="movePage(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="px-2 py-0.5 rounded bg-ink-950/80 text-[10px] text-white disabled:opacity-30 cursor-pointer">
            ←
          </button>
          <span class="text-[9px] text-slate-400 font-semibold">Page ${idx + 1}/${uploadedPages.length}</span>
          <button onclick="movePage(${idx}, 1)" ${idx === uploadedPages.length - 1 ? 'disabled' : ''} class="px-2 py-0.5 rounded bg-ink-950/80 text-[10px] text-white disabled:opacity-30 cursor-pointer">
            →
          </button>
        </div>
      </div>
    `).join('');
  }

  window.removePage = function (idx) {
    uploadedPages.splice(idx, 1);
    renderPagesGrid();
  };

  window.movePage = function (idx, direction) {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= uploadedPages.length) return;
    const temp = uploadedPages[idx];
    uploadedPages[idx] = uploadedPages[targetIdx];
    uploadedPages[targetIdx] = temp;
    renderPagesGrid();
  };

  window.clearAllPages = function () {
    if (!confirm('Clear all uploaded pages?')) return;
    uploadedPages = [];
    renderPagesGrid();
  };

  /* --------------------------------------------------------------------------
     SUBMIT ANSWER SHEET
     -------------------------------------------------------------------------- */
  window.submitAnswerSheet = async function () {
    if (uploadedPages.length === 0) {
      alert('Please add at least one page');
      return;
    }

    const submitBtn = $('submitEvalBtn');
    const selector = $('paperSelector');
    const medium = $('mediumSelector')?.value || 'Hindi';

    const selectedOption = selector?.options[selector.selectedIndex];
    const paperId = selector?.value || null;
    const paperCode = selectedOption?.getAttribute('data-code') || '';
    const year = selectedOption?.getAttribute('data-year') || null;
    const examPhase = selectedOption?.getAttribute('data-phase') || '';
    const setCode = selectedOption?.getAttribute('data-set') || '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳ Uploading to Cloudinary...</span>';
    }

    // 👇 NAYA: 3D Cube Overlay Show karo 👇
    const overlay = $('cubeLoadingOverlay');
    if (overlay) {
      overlay.classList.add('active');
    }

    try {
      // Payload for backend (Backend will upload base64 to Cloudinary)
      const payload = {
        boardCode: currentProfile.board || 'bseb',
        classLevel: currentProfile.classLevel || '10',
        subjectCode: currentSubjectCode,
        subjectName: currentProfile.selectedSubjects?.find((s) => s.code === currentSubjectCode)?.name || currentSubjectCode,
        medium,
        paperId: paperId || null,
        paperCode,
        year,
        examPhase,
        setCode,
        pages: uploadedPages.map((p, idx) => ({
          pageNumber: idx + 1,
          imageBase64: p.base64, // Backend will handle this!
          mimeType: p.mimeType,
        })),
      };

      const res = await API.subjective.uploadSheet(payload);

      if (!res.success || !res.submissionId) {
        throw new Error(res.error || 'Failed to upload answer copy');
      }

      activeSubmissionId = res.submissionId;
      
      // Overlay band karo aur polling start karo
      if (overlay) overlay.classList.remove('active');
      
      startEvaluationPolling(activeSubmissionId);

    } catch (err) {
      console.error('Submit answer sheet error:', err);
      alert(err.message || 'Failed to upload answer sheet');
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🚀 Check Copy with AI Vision</span><span>→</span>';
      }
    } finally {
      // 👇 NAYA: Chahe success ho ya error, overlay band ho jaye 👇
      if (overlay) {
        overlay.classList.remove('active');
      }
    }
  };

  /* --------------------------------------------------------------------------
     POLLING & PROGRESS TRACKING
     -------------------------------------------------------------------------- */
  function startEvaluationPolling(submissionId) {
    const progressCard = $('evalProgressCard');
    const resultsCard = $('evalResultsCard');
    if (progressCard) progressCard.classList.remove('hidden');
    if (resultsCard) resultsCard.classList.add('hidden');

    if (pollingInterval) clearInterval(pollingInterval);

    progressCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    pollingInterval = setInterval(async () => {
      try {
        const res = await API.subjective.getStatus(submissionId);
        if (!res.success) return;

        updateProgressUI(res);

        if (res.status === 'completed') {
          clearInterval(pollingInterval);
          pollingInterval = null;
          await loadSubmissionResult(submissionId);
        } else if (res.status === 'failed') {
          clearInterval(pollingInterval);
          pollingInterval = null;
          alert('Evaluation failed: ' + (res.errorMessage || 'Please try uploading again.'));
          resetEvaluationFlow();
        }
      } catch (err) {
        console.warn('Status poll error:', err);
      }
    }, 2500);
  }

  function updateProgressUI(statusData) {
    const bar = $('evalProgressBar');
    const percentEl = $('evalProgressPercent');
    const pageText = $('evalProgressPageText');
    const title = $('evalProgressTitle');
    const subtitle = $('evalProgressSubtitle');
    const pill = $('evalStatusPill');

    const status = statusData.status;
    const total = statusData.totalPages || 1;
    const processed = statusData.processedPages || 0;

    let pct = 20;
    if (status === 'uploading') {
      pct = 25;
      if (title) title.textContent = 'Upload Received';
      if (subtitle) subtitle.textContent = 'Queuing pages for Gemini Vision Handwriting OCR';
    } else if (status === 'ocr_processing') {
      pct = Math.round(30 + (processed / total) * 35);
      if (title) title.textContent = `Transcribing Handwriting (${processed}/${total} pages)`;
      if (subtitle) subtitle.textContent = 'Extracting Hindi/English handwritten words & equations';
    } else if (status === 'evaluating') {
      pct = 85;
      if (title) title.textContent = 'Checking Against Board Marking Scheme…';
      if (subtitle) subtitle.textContent = 'Awarding step marks, diagram credits, and examiner feedback';
    } else if (status === 'completed') {
      pct = 100;
      if (title) title.textContent = 'Evaluation Ready!';
      if (subtitle) subtitle.textContent = 'Scored copy and corrections generated';
    }

    if (bar) bar.style.width = pct + '%';
    if (percentEl) percentEl.textContent = pct + '%';
    if (pageText) pageText.textContent = `Processed ${processed} of ${total} pages`;
    if (pill) pill.textContent = status.replace('_', ' ');
  }

  /* --------------------------------------------------------------------------
     RENDER EVALUATION RESULTS
     -------------------------------------------------------------------------- */
  async function loadSubmissionResult(submissionId) {
    const progressCard = $('evalProgressCard');
    const resultsCard = $('evalResultsCard');

    try {
      const res = await API.subjective.getResult(submissionId);
      const sub = res.submission;
      if (!sub) return;

      if (progressCard) progressCard.classList.add('hidden');
      if (resultsCard) resultsCard.classList.remove('hidden');

      resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

      const titleEl = $('resSubjectTitle');
      if (titleEl) titleEl.textContent = `${sub.subjectName || sub.subjectCode} Copy Evaluated`;

      const attrEl = $('resPaperAttribution');
      if (attrEl) {
        attrEl.textContent = sub.paperCode
          ? `Checked against ${sub.paperCode} Official Board Scheme`
          : 'Checked against Official Board Curriculum & Model Answers';
      }

      const scoreEl = $('resScoreText');
      if (scoreEl) scoreEl.textContent = `${sub.obtainedMarks}/${sub.totalMarks}`;

      const percentEl = $('resPercentText');
      if (percentEl) percentEl.textContent = `${sub.percentage}% Marks Awarded`;

      const fbEl = $('resOverallFeedback');
      if (fbEl) fbEl.textContent = sub.overallFeedback || 'Evaluation completed successfully.';

      const listEl = $('evalQuestionsList');
      if (listEl) {
        const evals = sub.evaluations || [];
        if (evals.length === 0) {
          listEl.innerHTML = '<p class="text-xs text-slate-500">No question breakdown available.</p>';
        } else {
          listEl.innerHTML = evals.map((q) => renderQuestionCard(q)).join('');
        }
      }

      loadRecentSubmissions();
    } catch (err) {
      console.error('loadSubmissionResult error:', err);
    }
  }

  function renderQuestionCard(q) {
    const steps = q.stepMarksBreakdown || [];
    const covered = q.keywordsCovered || [];
    const missed = q.keywordsMissed || [];

    return `
      <div class="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-cyan-500/30 transition">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center gap-2.5">
            <span class="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
              Q${q.questionNumber}
            </span>
            <div>
              <h5 class="text-xs sm:text-sm font-bold text-white">${esc(q.questionText)}</h5>
              ${q.hindiQuestionText && q.hindiQuestionText !== q.questionText ? `<p class="text-xs text-slate-400 mt-0.5">${esc(q.hindiQuestionText)}</p>` : ''}
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-black ${q.awardedMarks >= q.maxMarks * 0.7 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'} shrink-0">
            ${q.awardedMarks}/${q.maxMarks} Marks
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-xs">
          <div class="p-3 rounded-xl bg-ink-950/60 border border-white/5">
            <p class="text-[11px] font-bold text-cyan-300 mb-1 flex items-center gap-1">
              <span>✍️</span> <span>Your Answer (Transcribed)</span>
            </p>
            <p class="text-slate-300 leading-relaxed font-mono text-[11px]">${esc(q.studentAnswer || 'Answer detected on copy')}</p>
          </div>

          <div class="p-3 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10">
            <p class="text-[11px] font-bold text-emerald-300 mb-1 flex items-center gap-1">
              <span>🏛️</span> <span>Official Model Answer</span>
            </p>
            <p class="text-slate-300 leading-relaxed text-[11px]">${esc(q.modelAnswer || 'Standard board solution')}</p>
          </div>
        </div>

        ${steps.length > 0 ? `
          <div class="mb-3 overflow-x-auto">
            <table class="w-full text-left text-xs border border-white/5 rounded-xl overflow-hidden">
              <thead class="bg-white/[0.03] text-slate-400 text-[10px] uppercase font-bold">
                <tr>
                  <th class="p-2">Marking Step</th>
                  <th class="p-2 w-20">Max Marks</th>
                  <th class="p-2 w-20">Awarded</th>
                  <th class="p-2">Examiner Comment</th>
                </tr>
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

        <div class="flex flex-wrap items-center gap-1.5 mb-2 text-[10px]">
          <span class="text-slate-400 font-semibold mr-1">Key Terminology:</span>
          ${covered.map((k) => `
            <span class="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
              ✓ ${esc(k)}
            </span>
          `).join('')}
          ${missed.map((k) => `
            <span class="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
              ✗ Missing: ${esc(k)}
            </span>
          `).join('')}
        </div>

        <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-300">
          <span class="font-bold text-cyan-400">Teacher Note:</span> ${esc(q.feedback || q.examinerRemarks || 'Good attempt.')}
        </div>
      </div>
    `;
  }

  window.resetEvaluationFlow = function () {
    uploadedPages = [];
    activeSubmissionId = null;
    if (pollingInterval) clearInterval(pollingInterval);

    $('evalProgressCard')?.classList.add('hidden');
    $('evalResultsCard')?.classList.add('hidden');
    renderPagesGrid();

    const submitBtn = $('submitEvalBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>🚀 Check Copy with AI Vision</span><span>→</span>';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* --------------------------------------------------------------------------
     RECENT SUBMISSIONS
     -------------------------------------------------------------------------- */
  async function loadRecentSubmissions() {
    const listEl = $('recentSubmissionsList');
    if (!listEl) return;

    try {
      const res = await API.subjective.getRecent(10);
      const subs = res.submissions || [];

      if (subs.length === 0) {
        listEl.innerHTML = '<p class="text-center py-4 text-xs text-slate-500">No answer sheets uploaded yet.</p>';
        return;
      }

      listEl.innerHTML = subs.map((s) => {
        const isDone = s.status === 'completed';
        const date = new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const pct = s.percentage || 0;

        return `
          <div onclick="loadSubmissionResult('${esc(s._id)}')" class="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 transition flex items-center justify-between gap-3 cursor-pointer group">
            <div class="flex items-center gap-3">
              <span class="text-xl">📄</span>
              <div>
                <p class="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  ${esc(s.subjectName || s.subjectCode)} ${s.paperCode ? `• ${esc(s.paperCode)}` : ''}
                </p>
                <p class="text-[10px] text-slate-400">
                  ${s.totalPages} pages • ${date} • <span class="capitalize ${isDone ? 'text-emerald-400' : 'text-amber-400'}">${s.status.replace('_', ' ')}</span>
                </p>
              </div>
            </div>

            <div class="text-right shrink-0">
              ${isDone ? `
                <p class="text-sm font-black ${pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}">${pct}%</p>
                <p class="text-[9px] text-slate-500">${s.obtainedMarks}/${s.totalMarks}</p>
              ` : `
                <span class="text-[10px] text-cyan-400 animate-pulse font-semibold">Processing</span>
              `}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.warn('loadRecentSubmissions error:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();