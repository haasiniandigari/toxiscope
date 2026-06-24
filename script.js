// ── STATE ──────────────────────────────────────────────────
const state = {
  history: [],
  stats: { total: 0, toxic: 0, clean: 0 }
};

// ── TAB SWITCHING ──────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;

    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(`tab-${target}`).classList.add('active');
  });
});

// ── SAMPLE CHIPS ───────────────────────────────────────────
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.getElementById('comment-input').value = chip.dataset.text;
    document.getElementById('comment-input').focus();
  });
});

// ── ANALYZE ────────────────────────────────────────────────
async function analyzeComment() {
  const input = document.getElementById('comment-input');
  const comment = input.value.trim();

  if (!comment) {
    flashTextarea(input);
    return;
  }

  showLoading(true);

  try {
    const response = await fetch('http://127.0.0.1:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: comment })
    });

    if (!response.ok) throw new Error('Server error');
    const data = await response.json();

    renderVerdict(data);
    addToHistory(comment, data);
    updateStats(data.label);

  } catch (err) {
    renderError('Could not connect to backend. Make sure backend is running on port 8000.');
    console.error(err);
  } finally {
    showLoading(false);
  }
}

// ── BATCH ANALYZE ──────────────────────────────────────────
async function analyzeBatch() {
  const input = document.getElementById('batch-input');
  const lines = input.value.split('\n').map(l => l.trim()).filter(Boolean);

  if (!lines.length) { flashTextarea(input); return; }

  showLoading(true);
  const resultsEl = document.getElementById('batch-results');
  resultsEl.innerHTML = '';

  for (let i = 0; i < lines.length; i++) {
    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: lines[i] })
      });

      if (!response.ok) throw new Error('Server error');
      const data = await response.json();

      const isToxic = data.label === 'toxic';
      const row = document.createElement('div');
      row.className = 'batch-row';
      row.innerHTML = `
        <span class="batch-row-idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="batch-row-text" title="${escHtml(lines[i])}">${escHtml(lines[i])}</span>
        <span class="batch-row-tag ${isToxic ? 'toxic' : 'clean'}">${isToxic ? 'TOXIC' : 'CLEAN'}</span>
        <span class="batch-row-prob">${(data.probability * 100).toFixed(1)}%</span>
      `;
      resultsEl.appendChild(row);
      addToHistory(lines[i], data);
      updateStats(data.label);

    } catch (err) {
      const row = document.createElement('div');
      row.className = 'batch-row';
      row.innerHTML = `<span class="batch-row-idx">${i + 1}</span><span class="batch-row-text" style="color:#555">Error analyzing this comment</span>`;
      resultsEl.appendChild(row);
    }
  }

  showLoading(false);
}

// ── RENDER VERDICT ──────────────────────────────────────────
function renderVerdict(data) {
  const panel = document.getElementById('verdict-body');
  const isToxic = data.label === 'toxic';
  const pct = (data.probability * 100).toFixed(1);
  const cls = isToxic ? 'toxic' : 'clean';
  const labelText = isToxic ? 'TOXIC' : 'CLEAN';

  panel.innerHTML = `
    <div class="verdict-result">
      <div class="verdict-label ${cls}">${labelText}</div>
      <div class="verdict-prob">
        Toxic probability: <span>${pct}%</span><br>
        Threshold: <span>50.0%</span><br>
      </div>
      <div class="prob-bar-wrap">
        <div class="prob-bar-label">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
        <div class="prob-bar-track">
          <div class="prob-bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="verdict-tag ${cls}">${labelText} · ${pct}%</div>
    </div>
  `;
}

function renderError(msg) {
  document.getElementById('verdict-body').innerHTML = `
    <div class="verdict-result">
      <div class="verdict-label" style="color:#888;font-size:1rem">ERROR</div>
      <div class="verdict-prob" style="color:#555">${msg}</div>
    </div>
  `;
}

// ── HISTORY ─────────────────────────────────────────────────
function addToHistory(text, data) {
  const isToxic = data.label === 'toxic';
  const entry = {
    text,
    label: data.label,
    prob: data.probability,
    time: new Date()
  };
  state.history.unshift(entry);

  const listEl = document.getElementById('history-list');

  // Clear placeholder
  if (listEl.querySelector('.verdict-awaiting')) listEl.innerHTML = '';

  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <span class="history-time">${formatTime(entry.time)}</span>
    <span class="history-text">${escHtml(text.length > 120 ? text.slice(0, 120) + '…' : text)}</span>
    <span class="history-badge ${isToxic ? 'toxic' : 'clean'}">${isToxic ? 'TOXIC' : 'CLEAN'} · ${(data.probability * 100).toFixed(0)}%</span>
  `;
  listEl.prepend(item);
}

// ── ANALYTICS ───────────────────────────────────────────────
function updateStats(label) {
  state.stats.total++;
  if (label === 'toxic') state.stats.toxic++;
  else state.stats.clean++;

  document.getElementById('stat-total').textContent = state.stats.total;
  document.getElementById('stat-toxic').textContent = state.stats.toxic;
  document.getElementById('stat-clean').textContent = state.stats.clean;

  const rate = state.stats.total ? (state.stats.toxic / state.stats.total * 100).toFixed(1) + '%' : '—';
  document.getElementById('stat-rate').textContent = rate;

  const toxicPct = state.stats.total ? (state.stats.toxic / state.stats.total * 100) : 0;
  document.getElementById('bar-fill').style.width = toxicPct + '%';
  document.getElementById('bar-label-toxic').textContent = toxicPct.toFixed(1) + '% toxic';
  document.getElementById('bar-label-clean').textContent = (100 - toxicPct).toFixed(1) + '% clean';
}

// ── UTILS ────────────────────────────────────────────────────
function clearInput() {
  document.getElementById('comment-input').value = '';
  document.getElementById('verdict-body').innerHTML = '<span class="verdict-awaiting">// awaiting input</span>';
}

function showLoading(show) {
  document.getElementById('loading-overlay').classList.toggle('hidden', !show);
}

function flashTextarea(el) {
  el.style.borderColor = '#e03f3f';
  el.focus();
  setTimeout(() => el.style.borderColor = '', 800);
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── ENTER KEY ────────────────────────────────────────────────
document.getElementById('comment-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analyzeComment();
});