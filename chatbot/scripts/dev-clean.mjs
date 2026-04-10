import { execSync, spawn } from "node:child_process";

const currentPid = process.pid;
const parentPid = process.ppid;

const getNodePids = () => {
  const command =
    "powershell -NoProfile -Command \"Get-CimInstance Win32_Process -Filter \\\"name='node.exe'\\\" | Select-Object -ExpandProperty ProcessId\"";

  const output = execSync(command, { encoding: "utf8" });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => Number(line))
    .filter((value) => Number.isInteger(value));
};

const terminatePid = (pid) => {
  if (pid === currentPid || pid === parentPid) {
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process may already be gone.
  }
};

const main = () => {
  const pids = getNodePids();
  for (const pid of pids) {
    terminatePid(pid);
  }

  const child = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: true
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
};

main();
