// js/ratings.js
// Requires Chart.js loaded globally from CDN

const SEASON_COLORS = ['#C8251A','#C8860A','#4A90D9','#7B5EA7','#E8D5A3','#2C6E49','#D4847A'];

export function initRatings(stats) {
  const { episodes } = stats;
  const el = document.getElementById('ratings');

  el.innerHTML = `
    <h2>IMDb Ratings</h2>
    <p class="subtitle">All ${episodes.length} episodes · hover for details · color per season</p>
    <div class="chart-wrap" style="height:320px">
      <canvas id="ratings-canvas"></canvas>
    </div>
  `;

  const ratings = episodes.map(ep => ep.rating).filter(r => r != null);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const yMin = Math.floor(minRating) - 0.5;
  const yMax = Math.ceil(maxRating) + 0.1;

  // Find season start x-positions for labels
  const seasonStarts = {};
  episodes.forEach((ep, i) => {
    if (!seasonStarts[ep.season]) seasonStarts[ep.season] = i;
  });

  const data = episodes.map((ep, i) => ({
    x: i + 1,
    y: ep.rating,
    label: ep.title,
    season: ep.season,
  }));

  const chart = new Chart(document.getElementById('ratings-canvas'), {
    type: 'scatter',
    data: {
      datasets: [{
        data,
        backgroundColor: data.map(d => SEASON_COLORS[d.season - 1]),
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const d = ctx.raw;
              return `${d.label} — ${d.y} ★`;
            },
          }
        }
      },
      scales: {
        x: {
          min: 1,
          max: episodes.length,
          ticks: {
            color: '#3D3D55',
            font: { size: 13 },
            callback: (val) => {
              // Show season label at season start positions
              const match = Object.entries(seasonStarts).find(([, idx]) => idx + 1 === val);
              return match ? `S${match[0]}` : '';
            },
            maxRotation: 0,
          },
          grid: { color: '#2A2A38' },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: { color: '#3D3D55', font: { size: 13 } },
          grid: { color: '#2A2A38' },
        }
      }
    }
  });

  // Add callout overlays after chart animation completes (more reliable than rAF)
  chart.options.animation = {
    onComplete: () => addCallouts(chart, data, episodes, el)
  };
  chart.update();
}

function addCallouts(chart, data, episodes, el) {
  const wrap = el.querySelector('.chart-wrap');
  const meta = chart.getDatasetMeta(0);

  const peakIdx = episodes.findIndex(ep => ep.id === (
    episodes.reduce((best, ep) => (ep.rating ?? 0) > (best.rating ?? 0) ? ep : best)
  ).id);
  const lowIdx = episodes.findIndex(ep => ep.id === (
    episodes.filter(ep => ep.rating != null)
             .reduce((worst, ep) => ep.rating < worst.rating ? ep : worst)
  ).id);

  function makeCallout(idx, isLow) {
    if (idx < 0 || !meta.data[idx]) return;
    const pt = meta.data[idx];
    const ep = episodes[idx];
    const div = document.createElement('div');
    div.className = `chart-callout${isLow ? ' low' : ''}`;
    div.textContent = `${ep.rating} ★ ${ep.title}`;
    // Position relative to chart-wrap
    const wrapRect = wrap.getBoundingClientRect();
    const canvasRect = chart.canvas.getBoundingClientRect();
    const left = canvasRect.left - wrapRect.left + pt.x;
    const top  = canvasRect.top  - wrapRect.top  + pt.y + (isLow ? 12 : -36);
    div.style.cssText = `left:${left}px;top:${top}px;transform:translateX(-50%)`;
    wrap.style.position = 'relative';
    wrap.appendChild(div);
  }

  makeCallout(peakIdx, false);
  makeCallout(lowIdx, true);
}
