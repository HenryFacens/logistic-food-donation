const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 2_000);

try {
  const response = await fetch("http://127.0.0.1:5300/health", {
    signal: controller.signal,
  });
  const payload = await response.json();
  if (!response.ok || payload.status !== "healthy") {
    process.exitCode = 1;
  }
} catch {
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
