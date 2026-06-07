import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const imageName = "bld-remote-browser:latest";
const containerName = "bld-remote-browser";
const dockerBinary = findDockerBinary();

export async function ensureDockerAvailable() {
  try {
    await execFileAsync(dockerBinary, ["--version"]);
  } catch {
    throw new Error("Docker is not installed or is not available on PATH. Install Docker Desktop, start it, then run this app again.");
  }
}

export async function buildBrowserImage() {
  await ensureDockerAvailable();
  await execFileAsync(dockerBinary, ["build", "-f", "docker/browser.Dockerfile", "-t", imageName, "."], {
    maxBuffer: 1024 * 1024 * 20
  });
}

export async function startBrowserContainer() {
  await ensureDockerAvailable();
  await removeBrowserContainer();
  await execFileAsync(dockerBinary, [
    "run",
    "-d",
    "--name",
    containerName,
    "-p",
    "9222:9222",
    "--shm-size=1g",
    imageName
  ]);
}

export async function removeBrowserContainer() {
  try {
    await execFileAsync(dockerBinary, ["rm", "-f", containerName]);
  } catch {
    // Removing a missing container should not block startup.
  }
}

export async function inspectBrowserContainer() {
  await ensureDockerAvailable();
  const { stdout } = await execFileAsync(dockerBinary, ["inspect", "-f", "{{.State.Running}}", containerName]);
  return stdout.trim() === "true";
}

function findDockerBinary() {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    "docker",
    "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe",
    localAppData ? join(localAppData, "Programs", "DockerDesktop", "resources", "bin", "docker.exe") : ""
  ];

  return candidates.find((candidate) => candidate === "docker" || existsSync(candidate)) ?? "docker";
}
