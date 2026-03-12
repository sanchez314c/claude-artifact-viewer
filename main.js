const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { WebSocketServer } = require('ws');

// Generate a shared secret token for this session — written to port file
const AUTH_TOKEN = crypto.randomBytes(32).toString('hex');
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_ARTIFACT_TYPES = ['html', 'markdown', 'code', 'text', 'json', 'csv', 'svg', 'mermaid'];

const CONFIG_DIR = path.join(process.env.HOME, '.claude-artifacts');
const PORT_FILE = path.join(CONFIG_DIR, 'port');
const STATE_FILE = path.join(CONFIG_DIR, 'window-state.json');
const THEME_FILE = path.join(CONFIG_DIR, 'theme.json');

let mainWindow;
let wss;
let httpServer;
let ownPort = null;

// ═══════════════════ Terminal Color Detection ═══════════════════

const COLORS_CACHE = path.join(CONFIG_DIR, 'detected-colors.json');

function detectTerminalColors() {
  // Read from cache file written by detect-colors.sh (runs in real shell env)
  try {
    const cached = JSON.parse(fs.readFileSync(COLORS_CACHE, 'utf-8'));
    if (cached.bg && cached.fg) return cached;
  } catch {}

  // Fallback: try running detection script directly
  try {
    const scriptPath = path.join(__dirname, 'hooks', 'detect-colors.sh');
    execSync(scriptPath, { timeout: 5000, stdio: 'ignore' });
    const cached = JSON.parse(fs.readFileSync(COLORS_CACHE, 'utf-8'));
    if (cached.bg && cached.fg) return cached;
  } catch {}

  return null;
}

function loadThemeConfig() {
  // Priority: 1) saved theme file, 2) auto-detect, 3) default
  try {
    const saved = JSON.parse(fs.readFileSync(THEME_FILE, 'utf-8'));
    if (saved.preset !== 'auto') return saved;
  } catch {}

  // Auto-detect
  const detected = detectTerminalColors();
  if (detected) return { preset: 'auto', detected };

  return { preset: 'auto-fallback' };
}

function saveThemeConfig(theme) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(THEME_FILE, JSON.stringify(theme, null, 2));
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const bounds = mainWindow.getBounds();
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      alwaysOnTop: mainWindow.isAlwaysOnTop()
    };
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {}
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;
  const saved = loadWindowState();

  const defaults = {
    width: 560,
    height: screenHeight - 40,
    x: screenWidth - 580,
    y: 20
  };
  const bounds = saved || defaults;

  // Match window background to terminal immediately (no white flash)
  const theme = loadThemeConfig();
  let windowBg = '#0d1117';
  if (theme.preset === 'auto' && theme.detected) {
    windowBg = theme.detected.bg;
  } else if (theme.preset === 'auto-fallback') {
    const det = detectTerminalColors();
    if (det) windowBg = det.bg;
  }

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 360,
    minHeight: 400,
    frame: false,
    transparent: false,
    backgroundColor: windowBg,
    alwaysOnTop: saved?.alwaysOnTop || false,
    resizable: true,
    skipTaskbar: false,
    title: 'Artifact Viewer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox: true is incompatible with this preload — preload requires npm packages
      // (dompurify, marked, highlight.js) via require(). Electron sandbox mode disables
      // require() for non-built-in modules in preload scripts. Security is enforced via
      // contextIsolation:true + nodeIntegration:false instead.
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', saveWindowState);
  mainWindow.on('moved', saveWindowState);
  mainWindow.on('resized', saveWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('pin-state', mainWindow.isAlwaysOnTop());
    // Send theme config to renderer
    const theme = loadThemeConfig();
    mainWindow.webContents.send('theme-config', theme);
  });
}

function startWebSocketServer() {
  httpServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/artifact') {
      // S-3: Token authentication
      const authHeader = req.headers['authorization'];
      if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // S-3: Body size limit
      let body = '';
      let bodySize = 0;
      req.on('data', chunk => {
        bodySize += chunk.length;
        if (bodySize > MAX_BODY_SIZE) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Payload too large' }));
          req.destroy();
          return;
        }
        body += chunk;
      });
      req.on('end', () => {
        try {
          const artifact = JSON.parse(body);

          // S-4: Input validation
          if (!artifact || typeof artifact !== 'object') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid artifact data' }));
            return;
          }
          if (artifact.content && typeof artifact.content !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Content must be a string' }));
            return;
          }
          // Normalize type to a safe known value
          if (artifact.type && !VALID_ARTIFACT_TYPES.includes(artifact.type)) {
            artifact.type = 'text';
          }
          // Sanitize filename — strip path separators and traversal sequences
          if (artifact.filename) {
            artifact.filename = String(artifact.filename)
              .replace(/[\/\\]/g, '_')
              .replace(/\.\./g, '_');
          }

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('artifact', artifact);
            mainWindow.show();
            if (!mainWindow.isFocused()) mainWindow.flashFrame(true);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  httpServer.listen(0, '127.0.0.1', () => {
    ownPort = httpServer.address().port;
    const port = ownPort;

    // WebSocket server for real-time artifact push (future use — CLI and hooks currently use HTTP POST)
    wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        try {
          const artifact = JSON.parse(data.toString());
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('artifact', artifact);
            mainWindow.show();
            if (!mainWindow.isFocused()) mainWindow.flashFrame(true);
          }
        } catch (e) {
          console.error('Invalid artifact data:', e.message);
        }
      });
    });

    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(PORT_FILE, `${port}:${AUTH_TOKEN}`);
    console.log('Artifact Viewer active on port ' + port);
  });
}

// IPC handlers
ipcMain.on('toggle-pin', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const isPinned = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isPinned);
    mainWindow.webContents.send('pin-state', !isPinned);
    saveWindowState();
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('set-theme', (event, theme) => {
  saveThemeConfig(theme);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('theme-config', theme);
  }
});

ipcMain.handle('get-theme', () => {
  return loadThemeConfig();
});

ipcMain.handle('detect-terminal-colors', () => {
  return detectTerminalColors();
});

ipcMain.on('download-artifact', (event, { content, filename }) => {
  dialog.showSaveDialog(mainWindow, {
    defaultPath: filename,
    filters: [{ name: 'All Files', extensions: ['*'] }]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content);
      mainWindow.webContents.send('download-complete', result.filePath);
    }
  });
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  startWebSocketServer();
});

app.on('before-quit', () => {
  // Only delete port file if it still belongs to THIS instance
  // (prevents race condition when a new viewer starts before old one exits)
  // Port file format: "port:token"
  try {
    const fileData = fs.readFileSync(PORT_FILE, 'utf-8').trim();
    const filePort = fileData.split(':')[0];
    if (filePort === String(ownPort)) {
      fs.unlinkSync(PORT_FILE);
    }
  } catch {}
});

app.on('window-all-closed', () => {
  if (wss) wss.close();
  if (httpServer) httpServer.close();
  app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
