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
  } catch {}
}

function cleanDir() {
  const dir = path.join(process.cwd(), 'release-build', 'win-unpacked')
  try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
}

killWinUnpackedProcesses()
cleanDir()
