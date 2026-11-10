const host = document.querySelector('#package');
const params = new URLSearchParams(location.search);
const packageId = params.get('id');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const choice = (question, correct, wrong, index = 0) => {
  const options = [...wrong];
  options.splice(index % 4, 0, correct);
  return { question, options, answer: correct };
};
const vocabularyPractice = (cards) => cards.slice(0, 5).flatMap((card, index) => [
  choice(`What does “${card.word}” mean?`, card.definition, cards.filter((item) => item.word !== card.word).slice(index, index + 3).map((item) => item.definition), index),
  choice(`Complete: ${card.example.replace(card.word, '_____')}`, card.word, cards.filter((item) => item.word !== card.word).slice(index + 1, index + 4).map((item) => item.word), index + 1)
]);
const finalQuiz = (course) => [...course.grammar.questions, ...vocabularyPractice(course.vocabulary)].slice(0, 20);

if (!packageId || !window.GOKCEN_CURRICULUM?.[packageId]) {
  host.innerHTML = '<p class="empty-archive">This homework workspace could not be found.</p>';
} else {
  Promise.all([fetch('./index.json').then((r) => r.json()), fetch(`./${encodeURIComponent(packageId)}/homework.json`).then((r) => r.json())])
    .then(([lessons, pkg]) => {
      const course = window.GOKCEN_CURRICULUM[packageId];
      const storageKey = `gokcen-workspace-${packageId}-v2`;
      const state = JSON.parse(localStorage.getItem(storageKey) || '{"tab":"notes","answers":{},"checked":{},"scores":{}}');
      state.answers ??= {}; state.checked ??= {}; state.scores ??= {}; state.tab ??= 'notes';
      const save = () => localStorage.setItem(storageKey, JSON.stringify(state));
      const tabs = [['notes','Lesson notes'],['grammar','Grammar'],['vocabulary','Vocabulary'],['reading','Reading'],['listening','Listening'],['quiz','Final quiz']];
      const answerKey = (section, index) => `${section}-${index}`;
      const renderQuestions = (section, questions) => `<div class="exercise-list">${questions.map((item, index) => {
        const key = answerKey(section, index); const selected = state.answers[key]; const checked = state.checked[section];
        return `<article class="exercise-card ${checked ? (selected === item.answer ? 'is-correct' : 'is-wrong') : ''}"><p><b>${index + 1}.</b> ${escapeHtml(item.question)}</p><div class="answer-options">${item.options.map((option) => `<button type="button" data-answer="${escapeHtml(key)}" data-value="${escapeHtml(option)}" ${checked ? 'disabled' : ''} class="${selected === option ? 'selected-answer' : ''}">${escapeHtml(option)}</button>`).join('')}</div>${checked ? `<p class="answer-feedback">${selected === item.answer ? '✓ Correct.' : `Review: ${escapeHtml(item.answer)}`}</p>` : ''}</article>`;
      }).join('')}</div><div class="check-row">${state.scores[section] != null ? `<strong>Score: ${state.scores[section]} / ${questions.length}</strong>` : ''}<button type="button" data-check="${section}">Check answers</button>${state.checked[section] ? `<button type="button" class="secondary-action" data-retry="${section}">Try again</button>` : ''}</div>`;
      const renderReadings = () => course.readings.map((reading, index) => `<article class="reading-panel"><p class="section-step">READING ${index + 1} OF 3</p><h3>${escapeHtml(reading.title)}</h3><p class="reading-text">${escapeHtml(reading.text)}</p>${renderQuestions(`reading-${index}`, reading.questions)}</article>`).join('');
      const renderTab = () => {
        if (state.tab === 'notes') return `<section class="lesson-notes"><p class="section-step">WHAT WE STUDIED</p><h2>${escapeHtml(course.notes.title)}</h2>${course.notes.points.map((point) => `<article class="note-block"><h3>${escapeHtml(point.title)}</h3><p>${escapeHtml(point.text)}</p><p class="example-line">${escapeHtml(point.example)}</p></article>`).join('')}<div class="study-tip"><b>Study plan:</b> Read the notes, complete Grammar and Vocabulary, then read all three texts before the final quiz.</div></section>`;
        if (state.tab === 'grammar') return `<section><p class="section-step">GRAMMAR FOCUS</p><h2>${escapeHtml(course.grammar.title)}</h2><div class="explanation"><p>${escapeHtml(course.grammar.explanation)}</p><p>${escapeHtml(course.grammar.example)}</p></div>${renderQuestions('grammar', course.grammar.questions)}</section>`;
        if (state.tab === 'vocabulary') return `<section><p class="section-step">FLIP THE CARDS</p><h2>Vocabulary in context</h2><p class="lead">Tap a card to see the Turkish translation. Turn it back, say the word, then use it in a sentence.</p><div class="flashcard-grid">${course.vocabulary.map((card, index) => `<button class="flashcard" type="button" data-flip="${index}" aria-pressed="false"><span class="flash-front"><b>${escapeHtml(card.word)}</b><small>${escapeHtml(card.definition)}</small><em>${escapeHtml(card.example)}</em></span><span class="flash-back" hidden><b>Turkish</b><span>${escapeHtml(card.turkish)}</span></span></button>`).join('')}</div><h3 class="practice-heading">Vocabulary practice</h3>${renderQuestions('vocabulary', vocabularyPractice(course.vocabulary))}</section>`;
        if (state.tab === 'reading') return `<section><p class="section-step">A2 / A2+ READING</p><h2>Read for the details</h2><p class="lead">Read each text twice. First, understand the main idea. Then return to the text and answer the five questions.</p>${renderReadings()}</section>`;
        if (state.tab === 'listening') return `<section><p class="section-step">OUTSOURCED LISTENING</p><h2>${escapeHtml(course.listening.title)}</h2><div class="listening-card"><p>${escapeHtml(course.listening.instructions)}</p><a class="listening-link" target="_blank" rel="noopener noreferrer" href="${escapeHtml(course.listening.url)}">Open the A2 listening activity ↗</a><p class="resource-note">Source: British Council LearnEnglish. Listen twice, then complete the practice below.</p></div>${renderQuestions('listening', course.listening.questions)}</section>`;
        return `<section><p class="section-step">20 QUESTIONS · 4 OPTIONS EACH</p><h2>Final mixed quiz</h2><p class="lead">This quiz mixes the grammar and vocabulary from this lesson. Aim for 16 / 20 or more, then retry the questions you missed.</p>${renderQuestions('quiz', finalQuiz(course))}</section>`;
      };
      const render = () => {
        const done = ['grammar', 'vocabulary', 'listening', 'quiz'].filter((key) => state.scores[key] != null).length
          + (course.readings.every((_, index) => state.scores[`reading-${index}`] != null) ? 1 : 0);
        host.innerHTML = `<header class="workspace-header"><a class="studio-mark" href="index.html">GÖKÇEN <span>ENGLISH STUDIO</span></a><label class="lesson-picker" for="lesson-select">Switch lesson<select id="lesson-select">${lessons.map((lesson) => `<option value="${escapeHtml(lesson.id)}" ${lesson.id === packageId ? 'selected' : ''}>${escapeHtml(lesson.date)} · ${escapeHtml(lesson.title)}</option>`).join('')}</select></label></header><main class="workspace-main"><section class="workspace-hero"><p class="eyebrow">LESSON · ${escapeHtml(pkg.date)}</p><h1>${escapeHtml(pkg.title)}</h1><p>${escapeHtml(course.summary)}</p><output>${done} / 5 practice areas checked</output></section><nav class="workspace-tabs" role="tablist" aria-label="Lesson areas">${tabs.map(([id,label]) => `<button role="tab" type="button" data-tab="${id}" aria-selected="${state.tab === id}">${escapeHtml(label)}${state.scores[id] != null ? ' ✓' : ''}</button>`).join('')}</nav><div class="workspace-content" role="tabpanel">${renderTab()}</div></main>`;
        host.querySelector('#lesson-select').addEventListener('change', (event) => { location.href = `package.html?id=${encodeURIComponent(event.target.value)}`; });
        host.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { state.tab = button.dataset.tab; save(); render(); }));
        host.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => { const key = button.dataset.answer; state.answers[key] = button.dataset.value; save(); render(); }));
        host.querySelectorAll('[data-check]').forEach((button) => button.addEventListener('click', () => { const section = button.dataset.check; const questions = section === 'grammar' ? course.grammar.questions : section === 'vocabulary' ? vocabularyPractice(course.vocabulary) : section === 'listening' ? course.listening.questions : section === 'quiz' ? finalQuiz(course) : course.readings[Number(section.split('-')[1])].questions; state.checked[section] = true; state.scores[section] = questions.filter((item, index) => state.answers[answerKey(section, index)] === item.answer).length; save(); render(); }));
        host.querySelectorAll('[data-retry]').forEach((button) => button.addEventListener('click', () => { const section = button.dataset.retry; delete state.checked[section]; delete state.scores[section]; Object.keys(state.answers).filter((key) => key.startsWith(`${section}-`)).forEach((key) => delete state.answers[key]); save(); render(); }));
        host.querySelectorAll('[data-flip]').forEach((card) => card.addEventListener('click', () => { const front = card.querySelector('.flash-front'); const back = card.querySelector('.flash-back'); const flipped = back.hidden; front.hidden = flipped; back.hidden = !flipped; card.setAttribute('aria-pressed', String(flipped)); }));
      };
      render();
    })
    .catch(() => { host.innerHTML = '<p class="empty-archive">This homework workspace could not be loaded. Please try again later.</p>'; });
}
