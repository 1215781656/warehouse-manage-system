const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function killWinUnpackedProcesses() {
  try {
    const cmd = 'wmic process where "ExecutablePath like \"%win-unpacked%\"" get ProcessId,ExecutablePath /FORMAT:LIST'
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString()
    const pids = out.split('\n').filter(l => l.trim().startsWith('ProcessId=')).map(l => l.trim().split('=')[1]).filter(Boolean)
    for (const pid of pids) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }) } catch {}
    }
    // also kill by exe name
    try { execSync('taskkill /F /IM "校服仓库管理系统.exe"', { stdio: 'ignore' }) } catch {}
    try { execSync('taskkill /F /IM "electron.exe"', { stdio: 'ignore' }) } catch {}
  } catch {}
}

function cleanDir() {
  const bases = ['release-build-delivery', 'release-build']
  for (const base of bases) {
    const dir = path.join(process.cwd(), base, 'win-unpacked')
    try {
      const backup = dir + '-old-' + Date.now()
      try { fs.renameSync(dir, backup) } catch {}
      try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
      try { fs.rmSync(backup, { recursive: true, force: true }) } catch {}
    } catch {}
  }
}

killWinUnpackedProcesses()
cleanDir()
