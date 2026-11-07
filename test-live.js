(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  let attemptId = null;
  let questions = [];
  let subjectiveQuestions = [];
  let answers = new Map();
  let currentIndex = 0;
  let currentSection = 'mcq';
  let startedAt = Date.now();
  let finishedAt = null;
  let deadlineAt = null;
  let subjectiveUploadDeadlineAt = null;
  let timeLimitMs = 0;
  let timerInterval = null;
  let generationInterval = null;
  let generationSyncInFlight = false;
  let generationJobId = null;
  let savingAnswer = false;
  let savingState = false;
  let boardPatternSnapshot = null;
  let examMedium = 'English';
  let subjectiveRequired = false;
  let isMcqPractice = false;
  let generationComplete = false;
  let generationPaused = false;
  let generationStatusMessage = '';
  let waitingForNextQuestion = false;
  let stateSaveQueue = Promise.resolve();
  let selectedFiles = [];
  let subjectiveSubmissionId = null;
  let uploadStatusTimer = null;
  let uploadingSheet = false;
  let examCompleted = false;

  // ✅ FIX 1: advanceToAvailableQuestion को top-level पर move किया
  async function advanceToAvailableQuestion() {
    if (!waitingForNextQuestion || savingAnswer || savingState || currentIndex >= questions.length - 1) return;
    waitingForNextQuestion = false;
    await window.navigateQuestion(1);
  }

  function isUploadWindowOpen() {
    if (subjectiveUploadDeadlineAt) {
      return Date.now() <= new Date(subjectiveUploadDeadlineAt).getTime();
    }
    const windowBase = deadlineAt || (examCompleted && finishedAt ? new Date(finishedAt).getTime() : null);
    return !windowBase || Date.now() <= windowBase + 5 * 60 * 1000;
  }

  function persistAttemptState(patch) {
    stateSaveQueue = stateSaveQueue
      .catch(() => {})
      .then(() => API.tests.updateAttemptState(attemptId, patch));
    return stateSaveQueue;
  }

  function setUploadStatus(message, isError = false) {
    const status = $('subjectiveUploadStatus');
    status.textContent = message;
    status.classList.toggle('hidden', !message);
    status.classList.toggle('text-red-300', isError);
    status.classList.toggle('text-cyan-300', !isError);
    $('subjectiveUploadStatusBadge')?.classList.toggle('hidden', !subjectiveSubmissionId);
  }

  function renderSelectedFiles() {
    const container = $('pagesGridContainer');
    const grid = $('pagesGrid');
    const availability = $('answerSheetAvailability');
    const waitingForQuestions = subjectiveRequired && !isMcqPractice && !generationComplete;
    if (availability) {
      availability.classList.toggle('hidden', !waitingForQuestions);
      availability.textContent = generationPaused
        ? 'Question generation is recovering automatically. Your answers are safe; answer-sheet upload unlocks when generation finishes.'
        : 'Written questions are still being generated. You can prepare your answer sheet, and upload will unlock when generation finishes.';
    }
    grid.replaceChildren();
    container.classList.toggle('hidden', selectedFiles.length === 0);
    $('pageCountBadge').textContent = `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} added`;
    $('submitEvalBtn').disabled = selectedFiles.length === 0
      || uploadingSheet
      || !!subjectiveSubmissionId
      || !subjectiveQuestions.length
      || !generationComplete
      || !isUploadWindowOpen();
    if (!isUploadWindowOpen()) setUploadStatus('The answer-sheet upload window has closed.', true);

    selectedFiles.forEach((entry, index) => {
      const card = document.createElement('div');
      card.className = 'page-thumb relative rounded-xl border border-white/10 bg-white/5 p-2';
      if (entry.file.type.startsWith('image/')) {
        const image = document.createElement('img');
        image.src = entry.previewUrl;
        image.alt = `Answer sheet page ${index + 1}`;
        image.className = 'w-full h-28 object-cover rounded-lg';
        card.append(image);
      } else {
        const pdf = document.createElement('div');
        pdf.className = 'h-28 flex items-center justify-center text-3xl';
        pdf.textContent = '📄';
        card.append(pdf);
      }

      const name = document.createElement('p');
      name.className = 'text-[10px] text-slate-400 mt-2 truncate';
      name.textContent = entry.file.name;
      card.append(name);

      if (!subjectiveSubmissionId) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'absolute top-3 right-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Remove ${entry.file.name}`);
        remove.addEventListener('click', () => {
          URL.revokeObjectURL(entry.previewUrl);
          selectedFiles.splice(index, 1);
          renderSelectedFiles();
        });
        card.append(remove);
      }
      grid.append(card);
    });
  }

  function addSelectedFiles(files) {
    if (!isUploadWindowOpen()) {
      setUploadStatus('The answer-sheet upload window has closed.', true);
      return;
    }
    const currentBytes = selectedFiles.reduce((sum, entry) => sum + entry.file.size, 0);
    const incoming = Array.from(files);
    if (selectedFiles.length + incoming.length > 20) {
      setUploadStatus('A maximum of 20 files can be uploaded.', true);
      return;
    }
    if (incoming.some((file) => file.size > 10 * 1024 * 1024)
      || currentBytes + incoming.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) {
      setUploadStatus('Each file must be under 10 MB and the total upload under 20 MB.', true);
      return;
    }

    const unsupported = incoming.find((file) => !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type));
    if (unsupported) {
      setUploadStatus('Only JPEG, PNG, WebP images and PDF files are supported.', true);
      return;
    }

    selectedFiles.push(...incoming.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })));
    setUploadStatus('');
    renderSelectedFiles();
  }

  async function fileToBase64(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });
    return String(dataUrl).split(',', 2)[1];
  }

  async function pollSubjectiveSubmission() {
    if (!subjectiveSubmissionId) return;
    try {
      const status = await API.subjective.getStatus(subjectiveSubmissionId);
      if (status.status === 'completed') {
        setUploadStatus('Answer sheet evaluation is complete. Marks will appear when the result release time is reached.');
        $('retrySubjectiveBtn').classList.add('hidden');
        if (uploadStatusTimer) window.clearInterval(uploadStatusTimer);
        uploadStatusTimer = null;
      } else if (status.status === 'review_required') {
        setUploadStatus(status.errorMessage || 'This answer sheet needs review before marks can be released.', true);
        subjectiveSubmissionId = null;
        if (uploadStatusTimer) window.clearInterval(uploadStatusTimer);
        uploadStatusTimer = null;
        renderSelectedFiles();
        $('retrySubjectiveBtn').classList.add('hidden');
      } else if (status.status === 'failed') {
        setUploadStatus(status.errorMessage || 'Evaluation failed. Retry when ready.', true);
        $('retrySubjectiveBtn').classList.remove('hidden');
        if (uploadStatusTimer) window.clearInterval(uploadStatusTimer);
        uploadStatusTimer = null;
      } else {
        $('retrySubjectiveBtn').classList.add('hidden');
        setUploadStatus(`Answer sheet status: ${status.status}.`);
      }
    } catch (error) {
      if (error.status === 404) {
        subjectiveSubmissionId = null;
        renderSelectedFiles();
        setUploadStatus('The previous evaluation record is missing. Re-upload your answer sheet to continue.', true);
        $('retrySubjectiveBtn').classList.add('hidden');
        if (uploadStatusTimer) window.clearInterval(uploadStatusTimer);
        uploadStatusTimer = null;
        return;
      }
      setUploadStatus(error.message || 'Could not check answer-sheet status.', true);
    }
  }

  function startSubmissionStatusPolling() {
    if (!subjectiveSubmissionId) return;
    pollSubjectiveSubmission();
    if (!uploadStatusTimer) uploadStatusTimer = window.setInterval(pollSubjectiveSubmission, 5000);
  }

  async function retrySubjectiveEvaluation() {
    if (!subjectiveSubmissionId) return;
    const button = $('retrySubjectiveBtn');
    button.disabled = true;
    try {
      await API.subjective.retry(subjectiveSubmissionId);
      button.classList.add('hidden');
      setUploadStatus('Evaluation retry started.');
      startSubmissionStatusPolling();
    } catch (error) {
      setUploadStatus(error.message || 'Could not retry the evaluation.', true);
    } finally {
      button.disabled = false;
    }
  }

  function setupAnswerSheetUpload() {
    $('fileInput').addEventListener('change', (event) => {
      addSelectedFiles(event.target.files);
      event.target.value = '';
    });
    $('cameraInput').addEventListener('change', (event) => {
      addSelectedFiles(event.target.files);
      event.target.value = '';
    });

    const dropZone = $('dropZone');
    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropZone.classList.remove('dragover');
      addSelectedFiles(event.dataTransfer.files);
    });
    $('retrySubjectiveBtn').addEventListener('click', retrySubjectiveEvaluation);
  }

  window.submitSubjectiveSheet = async function () {
    if (!attemptId || !selectedFiles.length || uploadingSheet || subjectiveSubmissionId
      || !subjectiveQuestions.length || !generationComplete || !isUploadWindowOpen()) return;
    uploadingSheet = true;
    $('submitEvalBtn').disabled = true;
    $('cubeLoadingOverlay').classList.add('active');
    setUploadStatus('Uploading answer sheet…');
    try {
      const pages = [];
      for (const entry of selectedFiles) {
        pages.push({
          mimeType: entry.file.type,
          imageBase64: await fileToBase64(entry.file),
        });
      }
      const response = await API.subjective.uploadSheet({ attemptId, pages });
      subjectiveSubmissionId = String(response.submissionId);
      selectedFiles.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
      selectedFiles = [];
      renderSelectedFiles();
      startSubmissionStatusPolling();
    } catch (error) {
      setUploadStatus(error.message || 'Could not upload the answer sheet. Please try again.', true);
    } finally {
      uploadingSheet = false;
      $('cubeLoadingOverlay').classList.remove('active');
      $('submitEvalBtn').disabled = selectedFiles.length === 0 || !!subjectiveSubmissionId
        || !subjectiveQuestions.length || !generationComplete || !isUploadWindowOpen();
    }
  };

  function showError(error) {
    const loading = $('loadingState');
    if (!loading) return;

    loading.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'max-w-md px-6 text-center';

    const message = document.createElement('p');
    message.className = 'text-sm font-semibold text-red-300';
    message.textContent = error?.message || 'Could not load this exam.';
    panel.append(message);

    const back = document.createElement('a');
    back.href = 'test-select.html';
    back.className = 'inline-block mt-5 px-4 py-2 rounded-lg bg-white/10 text-white text-sm';
    back.textContent = 'Back to tests';
    panel.append(back);
    loading.append(panel);
  }

  function renderQuestionWaitStatus() {
    const waitStatus = $('questionWaitStatus');
    if (!waitStatus) return;
    const waitingAtEnd = questions.length > 0
      && currentIndex === questions.length - 1
      && !!generationJobId
      && !generationComplete;
    waitStatus.classList.toggle('hidden', !waitingAtEnd);
    waitStatus.textContent = waitingAtEnd
      ? `You’re on the last question currently available. Your answers are saved. ${generationStatusMessage || 'More questions are being prepared and will appear here automatically.'}${waitingForNextQuestion ? ' You’ll move to the next question automatically when it arrives.' : ' Review earlier questions, or choose “Save & Next” to continue automatically when it arrives.'}`
      : '';
  }

  function renderQuestion() {
    const question = questions[currentIndex];
    if (!question) return;

    $('qNumber').textContent = `Q.${question.questionNumber || currentIndex + 1}`;
    $('qDifficulty').textContent = String(question.difficulty || 'MEDIUM').toUpperCase();
    $('qMarks').textContent = `+${question.marks || 1} Mark${Number(question.marks || 1) === 1 ? '' : 's'}`;
    const hindiMedium = examMedium.toLowerCase() === 'hindi';
    const questionText = hindiMedium
      ? question.hindiQuestionText || question.questionText
      : question.questionText || question.hindiQuestionText;
    $('qText').textContent = questionText || '';
    $('qText').lang = hindiMedium ? 'hi' : 'en';
    $('qHindiText').textContent = hindiMedium ? '' : question.hindiQuestionText || '';
    $('qHindiText').classList.toggle('hidden', hindiMedium || !question.hindiQuestionText);
    $('prevBtn').disabled = examCompleted || currentIndex === 0 || savingAnswer || savingState;
    const waitingAtEnd = currentIndex === questions.length - 1
      && !!generationJobId
      && !generationComplete;
    renderQuestionWaitStatus();
    $('nextBtn').disabled = examCompleted || savingAnswer || savingState || (waitingAtEnd && waitingForNextQuestion);
    $('nextBtn').textContent = waitingAtEnd && waitingForNextQuestion ? 'Waiting for next question…' : 'Save & Next';
    $('skipBtn').disabled = examCompleted || savingAnswer || savingState || (waitingAtEnd && waitingForNextQuestion);

    const options = $('optionsContainer');
    options.replaceChildren();
    (question.options || []).forEach((option) => {
      const key = option.key || option.optionKey || '';
      const text = (hindiMedium ? option.hindiText : option.text)
        || option.text
        || option.value
        || '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option-btn w-full p-4 text-left text-sm text-slate-200 flex items-center gap-3';
      if (answers.get(String(question.id)) === String(key).toUpperCase()) button.classList.add('answered');

      const badge = document.createElement('span');
      badge.className = 'opt-key shrink-0 w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center font-bold';
      badge.textContent = key;
      const label = document.createElement('span');
      label.textContent = text;
      button.append(badge, label);
      button.disabled = examCompleted || savingAnswer || savingState;
      button.addEventListener('click', () => saveAnswer(question, key));
      options.append(button);
    });

    renderPalette();
    updateStats();
    $('progressBar').style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
  }

  function renderPalette() {
    const palette = $('questionNav');
    palette.replaceChildren();
    questions.forEach((question, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'q-dot';
      button.textContent = String(question.questionNumber || index + 1);
      if (index === currentIndex) button.classList.add('current');
      if (answers.has(String(question.id))) button.classList.add('answered');
      button.disabled = savingAnswer || savingState;
      button.addEventListener('click', () => {
        window.navigateQuestion(index - currentIndex);
      });
      palette.append(button);
    });
  }

  function updateStats() {
    const answered = answers.size;
    $('statCorrect').textContent = String(answered);
    $('statSkipped').textContent = String(Math.max(0, questions.length - answered));
  }

  async function saveAnswer(question, selectedOption) {
    if (savingAnswer || !selectedOption) return;
    savingAnswer = true;
    renderQuestion();

    try {
      await API.tests.submitAnswer(attemptId, {
        questionId: String(question.id),
        selectedOption,
      });
      answers.set(String(question.id), String(selectedOption).toUpperCase());
    } catch (error) {
      alert(error.message || 'Could not save your answer. Please try again.');
    } finally {
      savingAnswer = false;
      renderQuestion();
      await advanceToAvailableQuestion();
    }
  }

  function renderSubjective() {
    const list = $('subjectiveQuestionsList');
    const guidance = $('subjectiveAttemptGuidance');
    list.replaceChildren();
    const limits = [];
    if (Number(boardPatternSnapshot?.shortAttemptLimit) > 0) {
      limits.push(`only the first ${boardPatternSnapshot.shortAttemptLimit} short answers`);
    }
    if (Number(boardPatternSnapshot?.longAttemptLimit) > 0) {
      limits.push(`only the first ${boardPatternSnapshot.longAttemptLimit} long answers`);
    }
    guidance.textContent = limits.length
      ? `Number each answer clearly. Board choice rules apply: ${limits.join(' and ')} written on your answer sheet will be evaluated.`
      : 'Number each answer clearly so it can be matched to the exact question.';

    if (!subjectiveQuestions.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-slate-500';
      empty.textContent = subjectiveRequired
        ? 'Subjective questions are being generated. They will appear here automatically.'
        : 'Subjective questions are not available in this test.';
      list.append(empty);
      return;
    }

    subjectiveQuestions.forEach((question, index) => {
      const card = document.createElement('article');
      card.className = 'rounded-xl border border-white/10 bg-white/[0.02] p-4';
      const title = document.createElement('p');
      title.className = 'text-xs font-bold text-cyan-400 mb-2';
      const questionType = question.type === 'long' ? 'Long answer' : 'Short answer';
      title.textContent = `Question ${question.questionNumber || index + 1} · ${questionType} · ${question.marks || 2} marks`;
      const prompt = document.createElement('p');
      prompt.className = 'text-sm text-white leading-relaxed';
      const hindiMedium = examMedium.toLowerCase() === 'hindi';
      prompt.textContent = hindiMedium
        ? question.hindiQuestionText || question.questionText || ''
        : question.questionText || question.hindiQuestionText || '';
      card.append(title, prompt);
      if (!hindiMedium && question.hindiQuestionText) {
        const hindi = document.createElement('p');
        hindi.className = 'text-sm text-slate-400 mt-2 leading-relaxed';
        hindi.textContent = question.hindiQuestionText;
        card.append(hindi);
      }
      list.append(card);
    });
  }

  function startServerTimer() {
    const display = $('timerDisplay');
    if (!display) return;

    const update = () => {
      if (examCompleted) {
        display.textContent = 'Submitted';
        display.title = 'Exam submitted';
        return;
      }
      if (deadlineAt && waitingForNextQuestion && generationJobId && !generationComplete) {
        display.textContent = 'Paused';
        display.title = 'Exam timer is paused while waiting for the next generated question';
        return;
      }
      if (!deadlineAt) {
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = elapsedSeconds % 60;
        display.textContent = hours
          ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        display.title = 'Time elapsed';
        return;
      }

      const now = Date.now();
      const remainingMs = deadlineAt - now;
      if (remainingMs <= 0) {
        display.textContent = '00:00';
        display.title = 'Time expired';
        display.classList.add('text-red-400');
        if (timerInterval) window.clearInterval(timerInterval);
        return;
      }

      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;
      display.textContent = hours
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      display.title = 'Time remaining';

      if (remainingSeconds <= 300) {
        display.classList.add('text-red-400');
        display.classList.remove('text-amber-400');
      } else if (remainingSeconds <= 600) {
        display.classList.add('text-amber-400');
        display.classList.remove('text-red-400');
      }
    };

    update();
    if (examCompleted) return;
    timerInterval = window.setInterval(update, 1000);
  }

  function setGenerationStatus(message, isError = false) {
    generationStatusMessage = message || '';
    const status = $('questionGenerationStatus');
    if (status) {
      status.textContent = message;
      status.classList.toggle('hidden', !message);
      status.classList.toggle('text-red-300', isError);
      status.classList.toggle('text-cyan-300', !isError);
    }
    $('retryGenerationButton')?.classList.toggle('hidden', !isError || !generationJobId || examCompleted);
    renderQuestionWaitStatus();
  }

  async function retryQuestionGeneration() {
    const retryButton = $('retryGenerationButton');
    if (!attemptId || !generationJobId || examCompleted || retryButton?.disabled) return;
    if (retryButton) retryButton.disabled = true;
    try {
      const result = await API.tests.retryGeneration(attemptId);
      generationPaused = false;
      generationJobId = result.jobId || generationJobId;
      generationComplete = result.status === 'completed';
      setGenerationStatus(
        result.status === 'completed'
          ? 'Question generation is complete. Checking for remaining questions…'
          : result.progressMessage || 'Question generation retry queued. Your saved answers and timer are unchanged.',
      );
      startQuestionSync();
    } catch (error) {
      setGenerationStatus(error.message || 'Could not retry question generation. Please try again.', true);
    } finally {
      if (retryButton) retryButton.disabled = false;
    }
  }

  // ✅ FIX 2: पूरा syncGeneratedQuestions अब एक ही try/catch/finally में है
  async function syncGeneratedQuestions() {
    if (!generationJobId || generationSyncInFlight || !attemptId) return;
    generationSyncInFlight = true;

    try {
      const result = await API.tests.syncAttemptQuestions(attemptId);
      if (result.deadlineAt) deadlineAt = new Date(result.deadlineAt).getTime();
      if (result.subjectiveUploadDeadlineAt) {
        subjectiveUploadDeadlineAt = result.subjectiveUploadDeadlineAt;
      }

      const knownIds = new Set(questions.map((question) => String(question.id)));
      const addedQuestions = (result.addedQuestions || [])
        .filter((question) => question.id && !knownIds.has(String(question.id)));

      if (addedQuestions.length) {
        questions.push(...addedQuestions);
        renderQuestion();
        await advanceToAvailableQuestion();
      }

      const knownSubjectiveIds = new Set(subjectiveQuestions.map((question) => String(question.id)));
      const addedSubjectiveQuestions = (result.addedSubjectiveQuestions || [])
        .filter((question) => question.id && !knownSubjectiveIds.has(String(question.id)))
        .map((question, index) => ({
          ...question,
          questionNumber: subjectiveQuestions.length + index + 1,
        }));
      if (addedSubjectiveQuestions.length) {
        subjectiveQuestions.push(...addedSubjectiveQuestions);
        const subjectiveTab = $('tabBtn-subjective');
        if (subjectiveTab) subjectiveTab.classList.remove('hidden');
        renderSubjective();
        renderSelectedFiles();
      }

      const job = result.generationJob;
      if (!job) {
        generationComplete = true;
        generationPaused = false;
        setGenerationStatus('');
        stopQuestionSync();
      } else if (job.status === 'completed') {
        generationComplete = true;
        generationPaused = false;
        waitingForNextQuestion = false;
        renderSelectedFiles();
        setGenerationStatus(isMcqPractice
          ? `All ${questions.length} MCQ practice questions are ready.`
          : `Question generation is complete. ${questions.length} MCQs and ${subjectiveQuestions.length} written questions are available.`);
        stopQuestionSync();
      } else if (job.status === 'failed') {
        generationComplete = false;
        generationPaused = true;
        setGenerationStatus(
          `Question generation is recovering automatically. Your answers are safe. Last error: ${job.error || 'temporary generation failure'}`,
          true,
        );
        $('retryGenerationButton')?.classList.add('hidden');
        renderSelectedFiles();
      } else {
        generationComplete = false;
        generationPaused = false;
        renderSelectedFiles();
        setGenerationStatus(job.progressMessage || `More MCQs are being generated (${job.verifiedCount || 0}/${job.targetCount || 0}).`);
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setGenerationStatus(error.message || 'Could not check for new questions. Updates will retry automatically.', true);
    } finally {
      generationSyncInFlight = false;
    }
  }

  function stopQuestionSync() {
    if (generationInterval) window.clearInterval(generationInterval);
    generationInterval = null;
  }

  function startQuestionSync() {
    if (!generationJobId) return;
    syncGeneratedQuestions();
    generationInterval = window.setInterval(syncGeneratedQuestions, 4000);
  }

  function showExam(data) {
    attemptId = String(data.attemptId);
    questions = Array.isArray(data.questions) ? data.questions : [];
    subjectiveQuestions = Array.isArray(data.subjectiveQuestions) ? data.subjectiveQuestions : [];
    isMcqPractice = data.testType === 'chapter_mcq_practice';
    subjectiveRequired = !isMcqPractice && (
      !!data.subjectiveRequired
      || !!data.boardPatternSnapshot?.hasShortAnswer
      || !!data.boardPatternSnapshot?.hasLongAnswer
    );
    answers = new Map((data.answers || [])
      .filter((answer) => answer.questionId && answer.selectedOption)
      .map((answer) => [String(answer.questionId), String(answer.selectedOption).toUpperCase()]));

    const restoredIndex = Number(data.currentQuestionIndex);
    currentIndex = Number.isInteger(restoredIndex)
      ? Math.min(Math.max(restoredIndex, 0), Math.max(questions.length - 1, 0))
      : 0;
    currentSection = ['mcq', 'subjective'].includes(data.currentSection)
      ? data.currentSection
      : 'mcq';
    if (!subjectiveQuestions.length) currentSection = 'mcq';
    deadlineAt = data.deadlineAt ? new Date(data.deadlineAt).getTime() : null;
    waitingForNextQuestion = !!data.generationWaitStartedAt;
    subjectiveUploadDeadlineAt = data.subjectiveUploadDeadlineAt || null;
    timeLimitMs = Number(data.timeLimitMs) || 0;
    startedAt = data.startedAt ? new Date(data.startedAt).getTime() : Date.now();
    finishedAt = data.finishedAt || null;
    boardPatternSnapshot = data.boardPatternSnapshot || null;
    examMedium = data.medium || 'English';
    examCompleted = data.status === 'completed';
    generationJobId = examCompleted ? null : (data.generationJobId || null);
    generationComplete = !generationJobId;
    subjectiveSubmissionId = data.subjectiveSubmissionId ? String(data.subjectiveSubmissionId) : null;

    if (!questions.length) {
      throw new Error('No objective questions are available for this test yet.');
    }

    $('testTitle').textContent = data.subjectName || 'Digital Board Exam';
    $('testSubtitle').textContent = examCompleted
      ? (isMcqPractice ? 'Practice submitted' : 'Exam submitted')
      : `${data.chapterTitle || data.paperCode || 'Exam in progress'}${isMcqPractice ? ' · 10-question MCQ practice' : ''}`;
    $('loadingState').classList.add('hidden');
    $('testUI').classList.remove('hidden');
    $('testUI').classList.add('flex');
    $('finishBtn').classList.toggle('hidden', examCompleted);
    const attemptUrl = new URL(window.location.href);
    attemptUrl.search = '';
    attemptUrl.searchParams.set('attemptId', attemptId);
    window.history.replaceState({ attemptId }, '', attemptUrl);

    const subjectiveTab = $('tabBtn-subjective');
    if (subjectiveTab) {
      subjectiveTab.classList.toggle('hidden', isMcqPractice || (subjectiveQuestions.length === 0 && !subjectiveRequired));
    }

    renderSubjective();
    renderSelectedFiles();
    if (subjectiveSubmissionId) startSubmissionStatusPolling();
    switchSection(currentSection);
    renderQuestion();
    startServerTimer();
    startQuestionSync();
  }

  function switchSection(section) {
    const isMcq = section === 'mcq';
    currentSection = section;
    $('section-mcq').classList.toggle('hidden', !isMcq);
    $('section-subjective').classList.toggle('hidden', isMcq);
    $('tabBtn-mcq').classList.toggle('text-cyan-400', isMcq);
    $('tabBtn-mcq').classList.toggle('text-slate-400', !isMcq);
    $('tabBtn-subjective').classList.toggle('text-cyan-400', !isMcq);
    $('tabBtn-subjective').classList.toggle('text-slate-400', isMcq);
  }

  async function fetchAttemptState() {
    if (!attemptId) return null;
    return API.tests.getAttemptState(attemptId);
  }

  async function initialize() {
    try {
      if (!window.API?.Token?.exists()) {
        window.location.href = 'auth.html';
        return;
      }

      const resumeAttemptId = params.get('attemptId');
      if (resumeAttemptId) {
        attemptId = resumeAttemptId;
        const data = await fetchAttemptState();
        if (data.status === 'completed' && !data.subjectiveRequired) {
          window.location.href = `test-results.html?attemptId=${encodeURIComponent(attemptId)}`;
          return;
        }
        showExam(data);
        return;
      }

      const paperId = params.get('paperId');
      let data;
      if (paperId) {
        data = await API.tests.startPaperTest(paperId, { isHardMode: params.get('hard') === '1' });
      } else {
        const subjectCode = params.get('subject');
        if (!subjectCode) throw new Error('Select a subject before starting a test.');
        const chapter = params.get('chapter');
        data = await API.tests.startTest({
          subjectCode,
          chapterNumber: chapter ? Number(chapter) : undefined,
          testType: params.get('testType') || 'chapter_practice',
          isHardMode: params.get('hard') === '1',
          generationJobId: params.get('jobId') || undefined,
        });
      }
      showExam(data);
    } catch (error) {
      showError(error);
    }
  }

  window.navigateQuestion = async function (offset) {
    if (savingAnswer || savingState) return;
    const nextIndex = currentIndex + offset;
    if (nextIndex < 0) return;
    if (nextIndex >= questions.length) {
      if (offset > 0 && generationJobId && !generationComplete) {
        waitingForNextQuestion = true;
        savingState = true;
        renderQuestion();
        try {
          const state = await persistAttemptState({
            currentQuestionIndex: currentIndex,
            currentSection,
            generationWaiting: true,
          });
          if (state.deadlineAt) deadlineAt = new Date(state.deadlineAt).getTime();
        } catch (error) {
          waitingForNextQuestion = false;
          setGenerationStatus(error.message || 'Could not pause the exam timer while waiting for questions.', true);
          syncGeneratedQuestions();
        } finally {
          savingState = false;
          renderQuestion();
        }
      }
      return;
    }
    waitingForNextQuestion = false;
    savingState = true;
    renderQuestion();
    try {
      const state = await persistAttemptState({
        currentQuestionIndex: nextIndex,
        currentSection,
        generationWaiting: false,
      });
      if (state.deadlineAt) deadlineAt = new Date(state.deadlineAt).getTime();
      currentIndex = nextIndex;
    } catch (error) {
      console.error('Could not save current question position:', error);
      alert(error.message || 'Could not save your current position. Please check your connection and try again.');
    } finally {
      savingState = false;
      renderQuestion();
    }
  };

  window.skipQuestion = function () {
    window.navigateQuestion(1);
  };

  window.switchExamTab = async function (section) {
    if (!['mcq', 'subjective'].includes(section) || savingAnswer || savingState) return;
    if (section === 'subjective' && isMcqPractice) return;
    if (section === 'subjective' && !subjectiveQuestions.length) return;
    savingState = true;
    try {
      const state = await persistAttemptState({
        currentQuestionIndex: currentIndex,
        currentSection: section,
        generationWaiting: false,
      });
      if (state.deadlineAt) deadlineAt = new Date(state.deadlineAt).getTime();
      waitingForNextQuestion = false;
      switchSection(section);
    } catch (error) {
      console.error('Could not save current exam section:', error);
      alert(error.message || 'Could not save your exam section. Please check your connection and try again.');
    } finally {
      savingState = false;
      renderQuestion();
    }
  };

  window.handleFinishTest = function () {
    const answered = answers.size;
    $('finishModalStats').textContent = `You answered ${answered} of ${questions.length} MCQs.`;
    $('finishModal').classList.remove('hidden');
  };

  window.closeFinishModal = function () {
    $('finishModal').classList.add('hidden');
  };

  window.confirmFinishTest = async function () {
    if (uploadingSheet) {
      alert('Please wait for the answer-sheet upload to finish.');
      return;
    }
    const button = $('finishModal').querySelector('button:last-child');
    button.disabled = true;
    button.textContent = 'Submitting…';
    try {
      await API.tests.finishTest(attemptId);
      if (timerInterval) window.clearInterval(timerInterval);
      stopQuestionSync();
      window.location.href = `test-results.html?attemptId=${encodeURIComponent(attemptId)}`;
    } catch (error) {
      alert(error.message || 'Could not submit the exam. Please try again.');
      button.disabled = false;
      button.textContent = 'Submit';
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    $('retryGenerationButton')?.addEventListener('click', retryQuestionGeneration);
    setupAnswerSheetUpload();
    initialize();
  });
})();