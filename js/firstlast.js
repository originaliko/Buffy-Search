// js/firstlast.js

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function initFirstLast(stats) {
  const { first_last, characters } = stats;
  const colorMap = Object.fromEntries(characters.map(c => [c.name, c.color]));
  const el = document.getElementById('firstlast');

  const cards = first_last.map(entry => {
    const color = colorMap[entry.character] || '#444';
    const firstBlock = entry.first ? `
      <div class="fl-block">
        <div class="tag">First line</div>
        <div class="quote">"${esc(entry.first.line)}"</div>
        <div class="ep-ref">${esc(entry.first.episode_id).toUpperCase()} · ${esc(entry.first.episode_title)}</div>
      </div>` : '';
    const lastBlock = entry.last ? `
      <div class="fl-block">
        <div class="tag">Last line</div>
        <div class="quote">"${esc(entry.last.line)}"</div>
        <div class="ep-ref">${esc(entry.last.episode_id).toUpperCase()} · ${esc(entry.last.episode_title)}</div>
      </div>` : '';
    return `
      <div class="fl-card">
        <div class="fl-card-header">
          <div class="fl-dot" style="background:${color}"></div>${esc(entry.character)}
        </div>
        ${firstBlock}${lastBlock}
      </div>`;
  }).join('');

  el.innerHTML = `
    <h2>First &amp; Last Lines</h2>
    <p class="subtitle">How each character entered and exited the story</p>
    <div class="fl-grid">${cards}</div>
  `;
}
