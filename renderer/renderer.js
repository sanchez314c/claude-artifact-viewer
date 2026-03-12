// Artifact Viewer — Renderer Process

// ═══════════════════ Theme Engine ═══════════════════

const THEME_PRESETS = {
  'auto': { label: 'Auto (Terminal)', description: 'Matches your GNOME Terminal colors' },
  'github-dark': {
    label: 'GitHub Dark',
    colors: {
      bgPrimary: '#0d1117', bgSecondary: '#161b22', bgTertiary: '#21262d',
      bgHover: '#30363d', border: '#30363d', borderLight: '#21262d',
      textPrimary: '#e6edf3', textSecondary: '#8b949e', textMuted: '#484f58',
      accent: '#58a6ff', accentDim: '#1f6feb',
      green: '#3fb950', yellow: '#d29922', red: '#f85149'
    }
  },
  'dracula': {
    label: 'Dracula',
    colors: {
      bgPrimary: '#282a36', bgSecondary: '#21222c', bgTertiary: '#343746',
      bgHover: '#44475a', border: '#44475a', borderLight: '#343746',
      textPrimary: '#f8f8f2', textSecondary: '#bfbfbf', textMuted: '#6272a4',
      accent: '#bd93f9', accentDim: '#9b6bdf',
      green: '#50fa7b', yellow: '#f1fa8c', red: '#ff5555'
    }
  },
  'nord': {
    label: 'Nord',
    colors: {
      bgPrimary: '#2e3440', bgSecondary: '#3b4252', bgTertiary: '#434c5e',
      bgHover: '#4c566a', border: '#4c566a', borderLight: '#434c5e',
      textPrimary: '#eceff4', textSecondary: '#d8dee9', textMuted: '#4c566a',
      accent: '#88c0d0', accentDim: '#5e81ac',
      green: '#a3be8c', yellow: '#ebcb8b', red: '#bf616a'
    }
  },
  'monokai': {
    label: 'Monokai',
    colors: {
      bgPrimary: '#272822', bgSecondary: '#1e1f1c', bgTertiary: '#3e3d32',
      bgHover: '#49483e', border: '#49483e', borderLight: '#3e3d32',
      textPrimary: '#f8f8f2', textSecondary: '#cfcfc2', textMuted: '#75715e',
      accent: '#66d9ef', accentDim: '#38a5c5',
      green: '#a6e22e', yellow: '#e6db74', red: '#f92672'
    }
  },
  'one-dark': {
    label: 'One Dark',
    colors: {
      bgPrimary: '#282c34', bgSecondary: '#21252b', bgTertiary: '#2c313a',
      bgHover: '#3a3f4b', border: '#3a3f4b', borderLight: '#2c313a',
      textPrimary: '#abb2bf', textSecondary: '#9da5b4', textMuted: '#5c6370',
      accent: '#61afef', accentDim: '#3b84c4',
      green: '#98c379', yellow: '#e5c07b', red: '#e06c75'
    }
  },
  'solarized-dark': {
    label: 'Solarized Dark',
    colors: {
      bgPrimary: '#002b36', bgSecondary: '#073642', bgTertiary: '#094959',
      bgHover: '#0a5a6e', border: '#094959', borderLight: '#073642',
      textPrimary: '#839496', textSecondary: '#657b83', textMuted: '#586e75',
      accent: '#268bd2', accentDim: '#1a6091',
      green: '#859900', yellow: '#b58900', red: '#dc322f'
    }
  },
  'catppuccin-mocha': {
    label: 'Catppuccin Mocha',
    colors: {
      bgPrimary: '#1e1e2e', bgSecondary: '#181825', bgTertiary: '#313244',
      bgHover: '#45475a', border: '#45475a', borderLight: '#313244',
      textPrimary: '#cdd6f4', textSecondary: '#bac2de', textMuted: '#6c7086',
      accent: '#89b4fa', accentDim: '#5d8fd4',
      green: '#a6e3a1', yellow: '#f9e2af', red: '#f38ba8'
    }
  }
};

let currentThemeName = 'github-dark';

function applyThemeColors(colors, font) {
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', colors.bgPrimary);
  root.style.setProperty('--bg-secondary', colors.bgSecondary);
  root.style.setProperty('--bg-tertiary', colors.bgTertiary);
  root.style.setProperty('--bg-hover', colors.bgHover);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--border-light', colors.borderLight);
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--text-secondary', colors.textSecondary);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-dim', colors.accentDim);
  root.style.setProperty('--green', colors.green);
  root.style.setProperty('--yellow', colors.yellow);
  root.style.setProperty('--red', colors.red);
  if (font) {
    root.style.setProperty('--font-mono', "'" + font.replace(/\s+\d+$/, '') + "', monospace");
  }
}

function deriveFullPalette(bg, fg, palette) {
  // Generate a full theme from just bg + fg (+ optional ANSI palette)
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
  }
  function mix(hex1, hex2, t) {
    const [r1, g1, b1] = hexToRgb(hex1);
    const [r2, g2, b2] = hexToRgb(hex2);
    return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  }
  function lighten(hex, amount) { return mix(hex, '#ffffff', amount); }
  function darken(hex, amount) { return mix(hex, '#000000', amount); }

  // ANSI color indices: 0=black 1=red 2=green 3=yellow 4=blue 5=magenta 6=cyan 7=white
  // 8-15 are bright versions
  const red    = (palette && palette[1])  || '#f85149';
  const green  = (palette && palette[2])  || '#3fb950';
  const yellow = (palette && palette[3])  || '#d29922';
  const blue   = (palette && palette[4])  || '#58a6ff';

  return {
    bgPrimary: bg,
    bgSecondary: lighten(bg, 0.05),
    bgTertiary: lighten(bg, 0.1),
    bgHover: lighten(bg, 0.15),
    border: lighten(bg, 0.15),
    borderLight: lighten(bg, 0.08),
    textPrimary: fg,
    textSecondary: mix(fg, bg, 0.3),
    textMuted: mix(fg, bg, 0.6),
    accent: blue,
    accentDim: darken(blue, 0.3),
    green: green,
    yellow: yellow,
    red: red
  };
}

function applyThemeConfig(config) {
  if ((config.preset === 'auto' || config.preset === 'auto-fallback') && config.detected) {
    currentThemeName = 'auto';
    const colors = deriveFullPalette(config.detected.bg, config.detected.fg, config.detected.palette);
    applyThemeColors(colors, config.detected.font);
    updateThemeButton();
    return;
  }

  // auto-fallback with no detection → use github-dark
  if (config.preset === 'auto-fallback') {
    currentThemeName = 'github-dark';
    applyThemeColors(THEME_PRESETS['github-dark'].colors);
    updateThemeButton();
    return;
  }

  const preset = THEME_PRESETS[config.preset];
  if (preset && preset.colors) {
    currentThemeName = config.preset;
    applyThemeColors(preset.colors);
    updateThemeButton();
  }
}

function updateThemeButton() {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  const preset = THEME_PRESETS[currentThemeName];
  btn.title = 'Theme: ' + (preset ? preset.label : currentThemeName);
}

function showThemePicker() {
  // Remove existing picker
  const existing = document.getElementById('theme-picker');
  if (existing) { existing.remove(); return; }

  const picker = document.createElement('div');
  picker.id = 'theme-picker';
  picker.className = 'theme-picker';

  Object.keys(THEME_PRESETS).forEach(key => {
    const preset = THEME_PRESETS[key];
    const item = document.createElement('div');
    item.className = 'theme-item' + (key === currentThemeName ? ' active' : '');

    const swatch = document.createElement('span');
    swatch.className = 'theme-swatch';
    if (preset.colors) {
      swatch.style.background = preset.colors.bgPrimary;
      swatch.style.borderColor = preset.colors.accent;
    } else {
      swatch.style.background = 'linear-gradient(135deg, #111112 50%, #d0cfcc 50%)';
      swatch.style.borderColor = '#58a6ff';
    }

    const label = document.createElement('span');
    label.className = 'theme-label';
    label.textContent = preset.label;

    item.appendChild(swatch);
    item.appendChild(label);

    item.addEventListener('click', () => {
      const config = { preset: key };
      window.artifactAPI.setTheme(config);
      // Apply immediately for auto
      if (key === 'auto') {
        window.artifactAPI.detectTerminalColors().then(detected => {
          applyThemeConfig({ preset: 'auto', detected });
        });
      } else {
        applyThemeConfig(config);
      }
      picker.remove();
      showToast('Theme: ' + preset.label);
    });

    picker.appendChild(item);
  });

  document.body.appendChild(picker);

  // Close picker on outside click
  setTimeout(() => {
    document.addEventListener('click', function closeHandler(e) {
      if (!picker.contains(e.target) && e.target.id !== 'btn-theme') {
        picker.remove();
        document.removeEventListener('click', closeHandler);
      }
    });
  }, 10);
}

// Listen for theme updates from main process
window.artifactAPI.onThemeConfig(applyThemeConfig);

const artifacts = [];
let activeIndex = -1;
let showRaw = false;
const ARTIFACT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Deterministic color assignment for sessions
const SESSION_COLORS = [
  '#58a6ff', '#3fb950', '#d29922', '#f85149',
  '#bc8cff', '#39d2c0', '#f778ba', '#79c0ff',
  '#7ee787', '#e3b341', '#ff7b72', '#d2a8ff'
];
const sessionColorMap = {};
function getSessionColor(session) {
  if (!session) return SESSION_COLORS[0];
  if (!sessionColorMap[session]) {
    const idx = Object.keys(sessionColorMap).length % SESSION_COLORS.length;
    sessionColorMap[session] = SESSION_COLORS[idx];
  }
  return sessionColorMap[session];
}

// DOM refs
const tabsScroll = document.getElementById('tabs-scroll');
const artifactCount = document.getElementById('artifact-count');
const artifactFilename = document.getElementById('artifact-filename');
const artifactType = document.getElementById('artifact-type');
const emptyState = document.getElementById('empty-state');
const renderedContent = document.getElementById('rendered-content');
const rawContent = document.getElementById('raw-content');
const statusText = document.getElementById('status-text');
const statusTime = document.getElementById('status-time');
const btnPin = document.getElementById('btn-pin');
const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const btnRaw = document.getElementById('btn-raw');

const btnTheme = document.getElementById('btn-theme');
const btnKeep = document.getElementById('btn-keep');

// ═══════════════════ Title Bar Controls ═══════════════════

btnPin.addEventListener('click', () => window.artifactAPI.togglePin());
btnTheme.addEventListener('click', () => showThemePicker());

btnKeep.addEventListener('click', () => {
  if (activeIndex < 0) return;
  toggleKeep(activeIndex);
});
btnMinimize.addEventListener('click', () => window.artifactAPI.minimizeWindow());
btnClose.addEventListener('click', () => window.artifactAPI.closeWindow());

window.artifactAPI.onPinState((pinned) => {
  btnPin.classList.toggle('pinned', pinned);
  btnPin.title = pinned ? 'Unpin from top' : 'Pin on top';
});

// ═══════════════════ Toolbar Actions ═══════════════════

btnCopy.addEventListener('click', () => {
  if (activeIndex < 0) return;
  const art = artifacts[activeIndex];
  navigator.clipboard.writeText(art.content).then(() => {
    showToast('Copied to clipboard');
  });
});

btnDownload.addEventListener('click', () => {
  if (activeIndex < 0) return;
  const art = artifacts[activeIndex];
  window.artifactAPI.downloadArtifact(art.content, art.filename);
});

btnRaw.addEventListener('click', () => {
  showRaw = !showRaw;
  btnRaw.classList.toggle('active', showRaw);
  btnRaw.textContent = showRaw ? 'Render' : 'Raw';
  renderActive();
});

window.artifactAPI.onDownloadComplete((filepath) => {
  const name = filepath.split('/').pop();
  showToast('Saved: ' + name);
});

// ═══════════════════ Keyboard Shortcuts ═══════════════════

document.addEventListener('keydown', (e) => {
  // Ctrl+C = copy
  if (e.ctrlKey && e.key === 'c' && !window.getSelection().toString()) {
    e.preventDefault();
    btnCopy.click();
  }
  // Ctrl+S = save/download
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    btnDownload.click();
  }
  // Ctrl+R = toggle raw
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    btnRaw.click();
  }
  // Ctrl+K = toggle keep on active artifact
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    if (activeIndex >= 0) toggleKeep(activeIndex);
  }
  // Ctrl+W = close active tab
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    if (activeIndex >= 0) removeArtifact(activeIndex);
  }
  // Ctrl+= / Ctrl++ = zoom in
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    const level = window.artifactAPI.zoomIn();
    localStorage.setItem('zoom-level', String(level));
    showToast('Zoom: ' + Math.round((level + 1) * 100) + '%');
  }
  // Ctrl+- = zoom out
  if (e.ctrlKey && e.key === '-') {
    e.preventDefault();
    const level = window.artifactAPI.zoomOut();
    localStorage.setItem('zoom-level', String(level));
    showToast('Zoom: ' + Math.round((level + 1) * 100) + '%');
  }
  // Ctrl+0 = reset zoom
  if (e.ctrlKey && e.key === '0') {
    e.preventDefault();
    window.artifactAPI.zoomReset();
    localStorage.setItem('zoom-level', '0');
    showToast('Zoom: Reset');
  }
  // Ctrl+Tab / Ctrl+Shift+Tab = cycle tabs
  if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    if (artifacts.length < 2) return;
    if (e.shiftKey) {
      activeIndex = (activeIndex - 1 + artifacts.length) % artifacts.length;
    } else {
      activeIndex = (activeIndex + 1) % artifacts.length;
    }
    renderTabs();
    renderActive();
  }
});

// ═══════════════════ Artifact Reception ═══════════════════

window.artifactAPI.onArtifact((data) => {
  if (data.action === 'clear') {
    artifacts.length = 0;
    activeIndex = -1;
    renderTabs();
    renderActive();
    updateStatus('Cleared');
    artifactCount.textContent = '0';
    return;
  }

  const artifact = {
    id: Date.now(),
    title: data.title || data.filename || 'Untitled',
    filename: data.filename || 'artifact.txt',
    content: data.content || '',
    type: data.type || 'text',
    language: data.language || '',
    timestamp: data.timestamp || new Date().toISOString(),
    source: data.source || 'unknown',
    session: data.session || '',
    kept: false,
    expiresAt: Date.now() + ARTIFACT_TTL_MS
  };

  artifacts.push(artifact);
  activeIndex = artifacts.length - 1;

  renderTabs();
  renderActive();
  const sessionLabel = artifact.session ? ' [' + artifact.session + ']' : '';
  updateStatus('Received: ' + artifact.title + sessionLabel);
  artifactCount.textContent = String(artifacts.length);
});

// ═══════════════════ Rendering ═══════════════════

function renderTabs() {
  tabsScroll.innerHTML = '';

  artifacts.forEach((art, i) => {
    const tab = document.createElement('div');
    let cls = 'tab';
    if (i === activeIndex) cls += ' active';
    if (!art.kept) cls += ' expiring';
    if (art.kept) cls += ' kept';
    tab.className = cls;

    // Kept indicator (clickable checkmark)
    const keepMark = document.createElement('span');
    keepMark.className = 'tab-keep' + (art.kept ? ' checked' : '');
    keepMark.textContent = art.kept ? '\u2713' : '\u25cb';
    keepMark.dataset.index = String(i);
    keepMark.title = art.kept ? 'Kept (click to unkeep)' : 'Click to keep';

    const indicator = document.createElement('span');
    indicator.className = 'source-indicator';
    indicator.style.background = getSessionColor(art.session);

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = art.title;

    // Tooltip shows session + source + expiry
    const tipParts = [];
    if (art.session) tipParts.push(art.session);
    tipParts.push('via ' + (art.source || 'unknown'));
    if (!art.kept && art.expiresAt) {
      const secs = Math.max(0, Math.round((art.expiresAt - Date.now()) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      tipParts.push('| expires in ' + m + ':' + String(s).padStart(2, '0'));
    }
    tab.title = tipParts.join(' ');

    const close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '\u2715';
    close.dataset.index = String(i);

    tab.appendChild(keepMark);
    tab.appendChild(indicator);
    tab.appendChild(label);
    tab.appendChild(close);

    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-keep')) {
        toggleKeep(parseInt(e.target.dataset.index));
        return;
      }
      if (e.target.classList.contains('tab-close')) {
        removeArtifact(parseInt(e.target.dataset.index));
        return;
      }
      activeIndex = i;
      renderTabs();
      renderActive();
    });

    tabsScroll.appendChild(tab);
  });

  // Scroll active tab into view
  const activeTab = tabsScroll.querySelector('.tab.active');
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}

function removeArtifact(index) {
  artifacts.splice(index, 1);
  if (activeIndex >= artifacts.length) activeIndex = artifacts.length - 1;
  if (activeIndex < 0) activeIndex = -1;
  artifactCount.textContent = String(artifacts.length);
  renderTabs();
  renderActive();
}

function renderActive() {
  if (activeIndex < 0 || artifacts.length === 0) {
    emptyState.classList.remove('hidden');
    renderedContent.classList.add('hidden');
    rawContent.classList.add('hidden');
    artifactFilename.textContent = 'No artifacts yet';
    artifactType.textContent = '';
    artifactType.className = 'badge type-badge';
    updateKeepButton();
    return;
  }

  const art = artifacts[activeIndex];
  emptyState.classList.add('hidden');

  // Update toolbar
  artifactFilename.textContent = art.filename;
  artifactType.textContent = art.type;
  artifactType.className = 'badge type-badge ' + art.type;

  // Update session badge
  const sessionBadge = document.getElementById('artifact-session');
  if (art.session) {
    sessionBadge.textContent = art.session;
    sessionBadge.style.borderColor = getSessionColor(art.session);
    sessionBadge.style.color = getSessionColor(art.session);
    sessionBadge.classList.remove('hidden');
  } else {
    sessionBadge.classList.add('hidden');
  }

  updateKeepButton();

  if (showRaw) {
    renderedContent.classList.add('hidden');
    rawContent.classList.remove('hidden');
    rawContent.textContent = art.content;
  } else {
    rawContent.classList.add('hidden');
    renderedContent.classList.remove('hidden');

    switch (art.type) {
      case 'markdown':
        renderedContent.innerHTML = window.artifactAPI.sanitizeHTML(window.artifactAPI.renderMarkdown(art.content));
        break;

      case 'html':
        renderedContent.innerHTML = window.artifactAPI.sanitizeHTML(art.content);
        break;

      case 'code': {
        const hl = window.artifactAPI.highlightCode(art.content, art.language);
        renderedContent.innerHTML = '<pre><code class="hljs language-' + escapeAttr(art.language) + '">' + hl + '</code></pre>';
        break;
      }

      case 'json': {
        let formatted = art.content;
        try {
          formatted = JSON.stringify(JSON.parse(art.content), null, 2);
        } catch {}
        const hl2 = window.artifactAPI.highlightCode(formatted, 'json');
        renderedContent.innerHTML = '<pre><code class="hljs language-json">' + hl2 + '</code></pre>';
        break;
      }

      default:
        renderedContent.innerHTML = '<pre>' + escapeHtml(art.content) + '</pre>';
    }
  }

  // Scroll to top
  document.getElementById('content').scrollTop = 0;
}

// ═══════════════════ Keep / Expiry ═══════════════════

function toggleKeep(index) {
  const art = artifacts[index];
  if (!art) return;
  art.kept = !art.kept;
  if (art.kept) {
    art.expiresAt = null;
    showToast('Kept: ' + art.title);
  } else {
    art.expiresAt = Date.now() + ARTIFACT_TTL_MS;
    showToast('Will expire in 5m');
  }
  renderTabs();
  updateKeepButton();
}

function updateKeepButton() {
  if (activeIndex < 0 || artifacts.length === 0) {
    btnKeep.textContent = 'Keep';
    btnKeep.classList.remove('active');
    return;
  }
  const art = artifacts[activeIndex];
  if (art.kept) {
    btnKeep.textContent = 'Kept';
    btnKeep.classList.add('active');
  } else {
    const remaining = art.expiresAt ? Math.max(0, art.expiresAt - Date.now()) : 0;
    const mins = Math.ceil(remaining / 60000);
    btnKeep.textContent = mins > 0 ? mins + 'm' : 'Keep';
    btnKeep.classList.remove('active');
  }
}

function sweepExpired() {
  const now = Date.now();
  let changed = false;
  for (let i = artifacts.length - 1; i >= 0; i--) {
    if (!artifacts[i].kept && artifacts[i].expiresAt && artifacts[i].expiresAt <= now) {
      artifacts.splice(i, 1);
      if (activeIndex >= i) activeIndex = Math.max(0, activeIndex - 1);
      changed = true;
    }
  }
  if (artifacts.length === 0) activeIndex = -1;
  if (changed) {
    artifactCount.textContent = String(artifacts.length);
    renderTabs();
    renderActive();
  }
  updateKeepButton();
}

// Sweep every 15 seconds
setInterval(sweepExpired, 15000);

// ═══════════════════ Helpers ═══════════════════

function updateStatus(text) {
  statusText.textContent = text;
  statusTime.textContent = new Date().toLocaleTimeString();
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ═══════════════════ Init ═══════════════════

// Restore saved zoom level
const savedZoom = parseFloat(localStorage.getItem('zoom-level'));
if (!isNaN(savedZoom) && savedZoom !== 0) {
  window.artifactAPI.setZoomLevel(savedZoom);
}

updateStatus('Listening...');
