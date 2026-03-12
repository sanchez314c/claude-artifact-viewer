const { contextBridge, ipcRenderer, webFrame } = require('electron');
const { marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs = require('highlight.js');
const createDOMPurify = require('dompurify');
// In Electron preload, 'window' refers to the renderer's window object
const DOMPurify = createDOMPurify(window);

// Configure marked with syntax highlighting
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }
}));

marked.use({ gfm: true, breaks: false });

contextBridge.exposeInMainWorld('artifactAPI', {
  onArtifact: (callback) => {
    ipcRenderer.on('artifact', (_, data) => callback(data));
  },
  onPinState: (callback) => {
    ipcRenderer.on('pin-state', (_, state) => callback(state));
  },
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (_, filepath) => callback(filepath));
  },
  onThemeConfig: (callback) => {
    ipcRenderer.on('theme-config', (_, config) => callback(config));
  },
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  detectTerminalColors: () => ipcRenderer.invoke('detect-terminal-colors'),
  togglePin: () => ipcRenderer.send('toggle-pin'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  downloadArtifact: (content, filename) => {
    ipcRenderer.send('download-artifact', { content, filename });
  },
  zoomIn: () => { webFrame.setZoomLevel(webFrame.getZoomLevel() + 0.5); return webFrame.getZoomLevel(); },
  zoomOut: () => { webFrame.setZoomLevel(webFrame.getZoomLevel() - 0.5); return webFrame.getZoomLevel(); },
  zoomReset: () => { webFrame.setZoomLevel(0); return 0; },
  getZoomLevel: () => webFrame.getZoomLevel(),
  setZoomLevel: (level) => webFrame.setZoomLevel(level),
  sanitizeHTML: (html) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
  renderMarkdown: (text) => marked.parse(text),
  highlightCode: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }
});
