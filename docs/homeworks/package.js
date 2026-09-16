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
      const render = () => {
        host.innerHTML = `<p class="eyebrow">${escapeHtml(pkg.date)}</p><h1>${escapeHtml(pkg.title)}</h1><p class="lead">Work through the sections selected for this lesson. Progress stays on this device.</p><button class="reset-progress" id="reset-progress">Reset my package progress</button><div class="future-sections">${pkg.sections.map((section) => `<article class="future-section"><h2>${escapeHtml(section.title)}</h2>${section.content ? `<p>${escapeHtml(section.content)}</p>` : ''}${Array.isArray(section.questions) ? section.questions.map((question) => `<fieldset><legend>${escapeHtml(question.prompt)}</legend>${question.choices.map((choice, index) => `<button data-question="${escapeHtml(question.id)}" data-answer="${index}" data-correct="${question.answerIndex}">${escapeHtml(choice)}</button>`).join('')}<p class="question-feedback" id="feedback-${escapeHtml(question.id)}"></p></fieldset>`).join('') : ''}<button class="complete-section" data-section="${escapeHtml(section.id)}">${progress.done[section.id] ? '✓ Section complete' : 'Mark section complete'}</button></article>`).join('')}</div>`;
        host.querySelector('#reset-progress').addEventListener('click', () => { localStorage.removeItem(key); progress.done = {}; render(); });
        host.querySelectorAll('.complete-section').forEach((button) => button.addEventListener('click', () => { progress.done[button.dataset.section] = true; localStorage.setItem(key, JSON.stringify(progress)); render(); }));
        host.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => {
          const correct = button.dataset.answer === button.dataset.correct;
          button.classList.add(correct ? 'correct-answer' : 'incorrect-answer');
          if (correct) button.closest('fieldset').querySelectorAll('[data-question]').forEach((choice) => choice.disabled = true);
          else button.disabled = true;
          const feedback = host.querySelector(`#feedback-${CSS.escape(button.dataset.question)}`);
          feedback.textContent = correct ? 'Correct. Read the explanation and continue.' : 'Try again after reviewing the section.';
        }));
      };
      render();
    })
    .catch(() => { host.innerHTML = '<p class="empty-archive">This homework package could not be loaded.</p>'; });
}
