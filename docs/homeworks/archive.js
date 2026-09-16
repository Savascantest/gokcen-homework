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
    archive.innerHTML = `<div class="archive-list">${entries.map((entry) => `<a class="archive-card" href="package.html?id=${encodeURIComponent(entry.id)}"><span>${escapeHtml(entry.date)}</span><strong>${escapeHtml(entry.title)}</strong></a>`).join('')}</div>`;
  })
  .catch(() => { archive.innerHTML = '<p class="empty-archive">The archive could not be loaded. Please try again later.</p>'; });
