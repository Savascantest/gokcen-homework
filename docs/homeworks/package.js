const host = document.querySelector('#package');
const params = new URLSearchParams(location.search);
const packageId = params.get('id');
const safeId = /^\d{4}-\d{2}-\d{2}-[a-z0-9]{10,24}$/.test(packageId || '');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

if (!safeId) {
  host.innerHTML = '<p class="empty-archive">This homework package could not be found.</p>';
} else {
  fetch(`./${encodeURIComponent(packageId)}/homework.json`)
    .then((response) => {
      if (!response.ok) throw new Error('package unavailable');
      return response.json();
    })
    .then((pkg) => {
      if (pkg.id !== packageId || !Array.isArray(pkg.sections)) throw new Error('invalid package');
      const key = `gokcen-homework-package-${packageId}-v1`;
      const progress = JSON.parse(localStorage.getItem(key) || '{"done":{}}');
      progress.done ??= {};
      const save = () => localStorage.setItem(key, JSON.stringify(progress));
      const render = () => {
        const completeCount = pkg.sections.filter((section) => progress.done[section.id]).length;
        host.innerHTML = `<a class="skip-link" href="#lesson-sections">Skip to lesson sections</a><p class="eyebrow">${escapeHtml(pkg.date)}</p><h1>${escapeHtml(pkg.title)}</h1><p class="lead">Take one section at a time. Your progress stays on this device, and you can retry every question.</p><div class="package-toolbar"><output class="package-progress" aria-live="polite"><b>${completeCount} / ${pkg.sections.length}</b> sections complete</output><button class="reset-progress" id="reset-progress">Reset this package</button></div><nav class="section-nav" aria-label="Lesson sections">${pkg.sections.map((section, index) => `<a href="#section-${escapeHtml(section.id)}">${String(index + 1).padStart(2, '0')} ${escapeHtml(section.title)}</a>`).join('')}</nav><div class="future-sections" id="lesson-sections">${pkg.sections.map((section, sectionIndex) => `<article class="future-section" id="section-${escapeHtml(section.id)}"><p class="section-step">SECTION ${sectionIndex + 1} OF ${pkg.sections.length}</p><h2>${escapeHtml(section.title)}</h2>${section.content ? `<p>${escapeHtml(section.content)}</p>` : ''}${Array.isArray(section.questions) ? section.questions.map((question, questionIndex) => `<fieldset><legend><span class="question-number">${questionIndex + 1}.</span> ${escapeHtml(question.prompt)}</legend><div class="answer-options">${question.choices.map((choice, index) => `<button type="button" data-question="${escapeHtml(question.id)}" data-answer="${index}" data-correct="${question.answerIndex}">${escapeHtml(choice)}</button>`).join('')}</div><p class="question-feedback" id="feedback-${escapeHtml(question.id)}" aria-live="polite">Choose an answer. You can retry if needed.</p></fieldset>`).join('') : ''}<div class="section-actions"><button class="complete-section" data-section="${escapeHtml(section.id)}">${progress.done[section.id] ? '✓ Section complete' : 'Mark section complete'}</button><a href="#lesson-sections">Back to sections</a></div></article>`).join('')}</div>`;
        host.querySelector('#reset-progress').addEventListener('click', () => { localStorage.removeItem(key); progress.done = {}; render(); });
        host.querySelectorAll('.complete-section').forEach((button) => button.addEventListener('click', () => { progress.done[button.dataset.section] = true; save(); render(); }));
        host.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => {
          const correct = button.dataset.answer === button.dataset.correct;
          const fieldset = button.closest('fieldset');
          fieldset.querySelectorAll('[data-question]').forEach((choice) => choice.classList.remove('selected-answer'));
          button.classList.add(correct ? 'correct-answer' : 'incorrect-answer');
          if (correct) fieldset.querySelectorAll('[data-question]').forEach((choice) => { choice.disabled = true; });
          const feedback = host.querySelector(`#feedback-${CSS.escape(button.dataset.question)}`);
          feedback.textContent = correct ? 'Correct. Say the full answer aloud, then continue.' : 'Not yet. Review the section and choose again.';
        }));
      };
      render();
    })
    .catch(() => { host.innerHTML = '<p class="empty-archive">This homework package could not be loaded.</p>'; });
}
