// js/episode-explorer.js
import { loadDialogues } from './main.js';

const OTHER_COLOR = '#444444';

// Build character color map from stats.characters
function buildColorMap(characters) {
  const map = {};
  characters.forEach(c => { map[c.name] = c.color; });
  return map;
}

// Render placeholder dots (gray) using line_count from stats
function renderPlaceholderDots(container, lineCount) {
  container.innerHTML = '';
  for (let i = 0; i < lineCount; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.style.background = OTHER_COLOR;
    container.appendChild(dot);
  }
}

// Render real dots from dialogue data
function renderDots(container, lines, colorMap) {
  container.innerHTML = '';
  lines.forEach(entry => {
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.style.background = colorMap[entry.character] || OTHER_COLOR;
    dot.title = entry.character
      ? `${entry.character}: ${entry.line}`
      : entry.line;
    container.appendChild(dot);
  });
}

function updateInfoBar(bar, ep, topSpeaker) {
  bar.innerHTML = `
    <div>Episode <span>${ep.id.toUpperCase()}</span></div>
    <div>Title <span>${ep.title}</span></div>
    <div>Rating <span>${ep.rating ?? 'N/A'} ★</span></div>
    <div>Lines <span>${ep.line_count}</span></div>
    <div>Top speaker <span>${topSpeaker || '—'}</span></div>
  `;
}

export function initExplorer(stats) {
  const { episodes, characters } = stats;
  const colorMap = buildColorMap(characters);

  // Group episodes by season
  const bySeason = {};
  episodes.forEach(ep => {
    (bySeason[ep.season] = bySeason[ep.season] || []).push(ep);
  });

  const el = document.getElementById('explorer');

  // Build legend HTML
  const legendHTML = characters.map(c =>
    `<div class="char-pill">
       <div class="swatch" style="background:${c.color}"></div>${c.name}
     </div>`
  ).join('') + `<div class="char-pill"><div class="swatch" style="background:${OTHER_COLOR}"></div>Other</div>`;

  // Build season buttons
  const seasons = Object.keys(bySeason).sort((a, b) => a - b);
  const seasonBtnsHTML = seasons.map(s =>
    `<button class="season-btn" data-season="${s}">S${s}</button>`
  ).join('');

  el.innerHTML = `
    <h2>Episode Explorer</h2>
    <p class="subtitle">Each dot is one line of dialogue — hover to read it</p>
    <div class="char-legend">${legendHTML}</div>
    <div class="ep-controls">
      ${seasonBtnsHTML}
      <select class="ep-select" id="ep-select"></select>
    </div>
    <div class="dot-grid" id="dot-grid"></div>
    <div class="ep-info-bar" id="ep-info-bar"></div>
  `;

  const dotGrid = el.querySelector('#dot-grid');
  const epSelect = el.querySelector('#ep-select');
  const infoBar = el.querySelector('#ep-info-bar');
  const seasonBtns = el.querySelectorAll('.season-btn');

  let dialoguesData = null;
  let isLoading = false;

  function populateDropdown(season) {
    const eps = bySeason[season] || [];
    epSelect.innerHTML = eps.map(ep =>
      `<option value="${ep.id}">S${ep.season}E${String(ep.episode).padStart(2,'0')} — ${ep.title}</option>`
    ).join('');
  }

  function showEpisode(epId) {
    const ep = episodes.find(e => e.id === epId);
    if (!ep) return;

    if (dialoguesData) {
      renderDots(dotGrid, dialoguesData[epId] || [], colorMap);
    } else {
      renderPlaceholderDots(dotGrid, ep.line_count);
    }
    updateInfoBar(infoBar, ep, ep.top_speaker);
  }

  function selectSeason(season) {
    seasonBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.season === String(season));
    });
    populateDropdown(season);
    showEpisode(epSelect.value);
  }

  // Season tab click — triggers lazy load
  seasonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectSeason(btn.dataset.season);
      if (!dialoguesData && !isLoading) {
        isLoading = true;
        dotGrid.innerHTML = '<p class="loading" style="padding:20px">Loading transcript data…</p>';
        loadDialogues()
          .then(data => {
            dialoguesData = data;
            isLoading = false;
            showEpisode(epSelect.value);
          })
          .catch(err => {
            isLoading = false;
            dotGrid.innerHTML = `<p class="error-msg">${err.message.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</p>`;
          });
      }
    });
  });

  // Episode dropdown change
  epSelect.addEventListener('change', () => showEpisode(epSelect.value));

  // Initial render: season 1, episode 1, gray placeholder dots (no fetch)
  populateDropdown(seasons[0]);
  seasonBtns[0]?.classList.add('active');
  const firstEp = (bySeason[seasons[0]] || [])[0];
  if (firstEp) showEpisode(firstEp.id);
}
