const { spawn } = require('child_process');
const os = require('os');

function findNextProcesses() {
  const platform = process.platform;
  if (platform === 'win32') {
    return spawn('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node|next' -and $_.CommandLine -match 'next dev' } | ForEach-Object { $_.ProcessId }"], { stdio: ['ignore', 'pipe', 'pipe'] });
  }

  return spawn('sh', ['-c', "ps -ef | grep '[n]ext dev' | awk '{print $2}'"], { stdio: ['ignore', 'pipe', 'pipe'] });
}

function killProcess(pid) {
  if (!pid) return;
  const platform = process.platform;
  if (platform === 'win32') {
    spawn('taskkill', ['/PID', String(pid), '/F'], { stdio: 'ignore' });
  } else {
    spawn('kill', ['-9', String(pid)], { stdio: 'ignore' });
  }
}

let stdout = '';
let stderr = '';
const finder = findNextProcesses();

finder.stdout.on('data', (data) => {
  stdout += data.toString();
});

finder.stderr.on('data', (data) => {
  stderr += data.toString();
});

finder.on('close', (code) => {
  const pids = stdout
    .split(/\s+/)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  pids.forEach(killProcess);

  const nextBin = require('path').join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
  const next = spawn(process.execPath, [nextBin, 'dev'], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  next.on('exit', (exitCode) => {
    process.exit(exitCode ?? 0);
  });
});
