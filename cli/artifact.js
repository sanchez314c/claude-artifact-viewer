#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const PORT_FILE = path.join(process.env.HOME, '.claude-artifacts', 'port');

function getSessionId() {
  // Use project directory name — matches what your terminal tab shows
  return path.basename(process.cwd()) || 'claude';
}

function getPortAndToken() {
  try {
    const data = fs.readFileSync(PORT_FILE, 'utf-8').trim();
    const colonIdx = data.indexOf(':');
    if (colonIdx === -1) {
      // Legacy format (no token) — old viewer running
      return { port: parseInt(data), token: null };
    }
    const port = parseInt(data.slice(0, colonIdx));
    const token = data.slice(colonIdx + 1);
    return { port, token };
  } catch {
    console.error('Artifact viewer is not running. Start it first.');
    process.exit(1);
  }
}
// Keep getPort for backward-compat with status command
function getPort() {
  return getPortAndToken().port;
}

function detectType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.md': 'markdown', '.markdown': 'markdown',
    '.html': 'html', '.htm': 'html', '.svg': 'html',
    '.json': 'json',
    '.js': 'code', '.ts': 'code', '.jsx': 'code', '.tsx': 'code',
    '.py': 'code', '.go': 'code', '.rs': 'code', '.rb': 'code',
    '.java': 'code', '.c': 'code', '.cpp': 'code', '.h': 'code',
    '.sh': 'code', '.bash': 'code', '.zsh': 'code',
    '.css': 'code', '.scss': 'code', '.less': 'code',
    '.yaml': 'code', '.yml': 'code', '.toml': 'code',
    '.xml': 'code', '.sql': 'code', '.graphql': 'code',
    '.txt': 'text', '.log': 'text', '.csv': 'text',
  };
  return map[ext] || 'text';
}

function detectLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.js': 'javascript', '.ts': 'typescript', '.jsx': 'javascript', '.tsx': 'typescript',
    '.py': 'python', '.go': 'go', '.rs': 'rust', '.rb': 'ruby',
    '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
    '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
    '.css': 'css', '.scss': 'scss', '.less': 'less',
    '.html': 'html', '.htm': 'html', '.xml': 'xml',
    '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
    '.toml': 'toml', '.sql': 'sql', '.graphql': 'graphql',
    '.md': 'markdown', '.markdown': 'markdown',
  };
  return map[ext] || '';
}

function pushArtifact(artifact) {
  const { port, token } = getPortAndToken();
  const payload = JSON.stringify(artifact);

  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/artifact',
      method: 'POST',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error('Server returned ' + res.statusCode + ': ' + body));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error('Cannot connect to artifact viewer: ' + err.message));
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log([
      'Claude Artifact Viewer CLI',
      '',
      'Usage:',
      '  artifact push <file> [--title "Title"]    Push a file as artifact',
      '  artifact push --stdin [--title "Title"]    Push stdin content',
      '  artifact push --text "content" [...]       Push text directly',
      '  artifact status                            Check if viewer is running',
      '  artifact clear                             Clear all artifacts',
      '',
      'Options:',
      '  --title, -t     Custom title for the artifact',
      '  --type          Force type (markdown|code|html|text|json)',
      '  --lang          Force language for syntax highlighting',
      '  --session       Override session name (default: current directory name)',
    ].join('\n'));
    process.exit(0);
  }

  const command = args[0];

  if (command === 'status') {
    try {
      const port = getPort();
      return new Promise((resolve) => {
        http.get('http://127.0.0.1:' + port + '/health', (res) => {
          if (res.statusCode === 200) {
            console.log('Artifact viewer is running on port ' + port);
          } else {
            console.log('Artifact viewer is not responding');
          }
          resolve();
        }).on('error', () => {
          console.log('Artifact viewer is not running');
          process.exit(1);
        });
      });
    } catch {
      console.log('Artifact viewer is not running');
      process.exit(1);
    }
  }

  if (command === 'clear') {
    await pushArtifact({ action: 'clear' });
    console.log('Artifacts cleared');
    return;
  }

  if (command === 'push') {
    let title = '';
    let type = '';
    let lang = '';
    let session = '';
    let content = '';
    let filename = '';
    let useStdin = false;
    let textContent = '';

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--title' || args[i] === '-t') {
        title = args[++i];
      } else if (args[i] === '--type') {
        type = args[++i];
      } else if (args[i] === '--lang') {
        lang = args[++i];
      } else if (args[i] === '--session') {
        session = args[++i];
      } else if (args[i] === '--stdin') {
        useStdin = true;
      } else if (args[i] === '--text') {
        textContent = args[++i];
      } else if (!filename) {
        filename = args[i];
      }
    }

    if (useStdin) {
      content = fs.readFileSync('/dev/stdin', 'utf-8');
      filename = filename || 'stdin.txt';
      type = type || 'text';
    } else if (textContent) {
      content = textContent;
      filename = filename || 'text.txt';
      type = type || 'text';
    } else if (filename) {
      const resolved = path.resolve(filename);
      if (!fs.existsSync(resolved)) {
        console.error('File not found: ' + filename);
        process.exit(1);
      }
      content = fs.readFileSync(resolved, 'utf-8');
      filename = path.basename(resolved);
      type = type || detectType(filename);
      lang = lang || detectLanguage(filename);
    } else {
      console.error('No input specified. Use a filename, --stdin, or --text');
      process.exit(1);
    }

    const artifact = {
      action: 'push',
      title: title || filename,
      filename: filename,
      content: content,
      type: type,
      language: lang,
      timestamp: new Date().toISOString(),
      source: 'cli',
      session: session || getSessionId()
    };

    try {
      await pushArtifact(artifact);
      console.log('Artifact pushed: ' + artifact.title);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    return;
  }

  console.error('Unknown command: ' + command);
  process.exit(1);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
