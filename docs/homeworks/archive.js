const archive = document.querySelector('#archive');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

fetch('./index.json')
  .then((response) => {
    if (!response.ok) throw new Error('archive unavailable');
    return response.json();
  })
  .then((entries) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      archive.innerHTML = '<p class="empty-archive">No future homework packages have been published yet.</p>';
      return;
    }
    archive.innerHTML = `<label class="lesson-picker archive-picker" for="lesson-select">Choose a lesson<select id="lesson-select">${entries.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.date)} · ${escapeHtml(entry.title)}</option>`).join('')}</select></label><p class="picker-help">Choose a lesson to open its notes, practice, reading, listening, speaking, and final review.</p>`;
    archive.querySelector('#lesson-select').addEventListener('change', (event) => { location.href = `package.html?id=${encodeURIComponent(event.target.value)}`; });
  })
  .catch(() => { archive.innerHTML = '<p class="empty-archive">The archive could not be loaded. Please try again later.</p>'; });
