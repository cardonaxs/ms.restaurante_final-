const email = process.env.STRESS_EMAIL;
const password = process.env.STRESS_PASSWORD;
const target = process.env.STRESS_TARGET || 'http://ms-usuarios:3001';
const maxConcurrency = Number(process.env.STRESS_MAX_CONCURRENCY || 32);
const stageDurationSeconds = Number(process.env.STRESS_STAGE_SECONDS || 8);

const requestTimeoutMs = 5000;
const maxRequests = 2000;
const cpuLimitPercent = 85;
const memoryLimitBytes = 512 * 1024 * 1024;
const memoryLimitPercent = 75;
const latencyLimitMs = 2000;
const recoveryTimeoutMs = 60000;
const candidateLevels = [1, 2, 4, 8, 12, 16, 24, 32];

if (!email || !password) {
  throw new Error('Define STRESS_EMAIL y STRESS_PASSWORD para una cuenta de prueba.');
}
if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1 || maxConcurrency > 32) {
  throw new Error('STRESS_MAX_CONCURRENCY debe ser un entero entre 1 y 32.');
}
if (!Number.isInteger(stageDurationSeconds) || stageDurationSeconds < 1 || stageDurationSeconds > 10) {
  throw new Error('STRESS_STAGE_SECONDS debe ser un entero entre 1 y 10.');
}

const baseUrl = new URL(target);
const loginUrl = new URL('/api/usuarios/login', baseUrl);
const metricsUrl = new URL('/metrics', baseUrl);
const concurrencyLevels = [...new Set([
  ...candidateLevels.filter((level) => level <= maxConcurrency),
  maxConcurrency
])].sort((a, b) => a - b);

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const index = Math.min(
    values.length - 1,
    Math.ceil((percentileValue / 100) * values.length) - 1
  );
  return values[index];
}

function metricValue(metricsText, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedName}(?:\\{[^}]*\\})?\\s+([-+]?\\d+(?:\\.\\d+)?(?:[eE][-+]?\\d+)?)$`);
  const values = metricsText
    .split('\n')
    .map((line) => line.match(pattern))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = requestTimeoutMs) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

async function checkLogin() {
  const response = await fetchWithTimeout(loginUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  await response.arrayBuffer();
  return response.ok;
}

async function readAppMetrics() {
  const response = await fetchWithTimeout(metricsUrl, {}, 2000);
  if (!response.ok) throw new Error(`El endpoint de métricas respondió HTTP ${response.status}.`);

  const text = await response.text();
  const userCpuSeconds = metricValue(text, 'process_cpu_user_seconds_total');
  const systemCpuSeconds = metricValue(text, 'process_cpu_system_seconds_total');
  const residentMemoryBytes = metricValue(text, 'process_resident_memory_bytes');

  if (
    !Number.isFinite(userCpuSeconds) ||
    !Number.isFinite(systemCpuSeconds) ||
    !Number.isFinite(residentMemoryBytes)
  ) {
    throw new Error('No se encontraron las métricas de CPU y memoria del proceso.');
  }
  return {
    cpuSeconds: userCpuSeconds + systemCpuSeconds,
    residentMemoryBytes,
    sampledAt: Date.now()
  };
}

async function checkReadiness() {
  const response = await fetchWithTimeout(metricsUrl, {}, 2000);
  return response.ok;
}

async function checkRecovery() {
  const deadline = Date.now() + recoveryTimeoutMs;
  let lastError = 'El servicio no respondió dentro del tiempo esperado.';

  while (Date.now() < deadline) {
    try {
      if (await checkReadiness() && await checkLogin()) {
        return { recovered: true, lastError: null };
      }
      lastError = 'El servicio respondió, pero el login de prueba todavía no funciona.';
    } catch (error) {
      lastError = error.name === 'AbortError'
        ? 'El login o la comprobación de salud agotó el tiempo de espera.'
        : error.message;
    }
    await sleep(2000);
  }

  return { recovered: false, lastError };
}

async function runStage(concurrency, total) {
  const deadline = Date.now() + stageDurationSeconds * 1000;
  const stats = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    latencies: [],
    stopReason: null,
    peakCpuPercent: 0,
    peakResidentMemoryBytes: 0
  };
  let previousSample = await readAppMetrics();

  async function worker() {
    while (
      !stats.stopReason &&
      Date.now() < deadline &&
      stats.attempted < maxRequests &&
      total.requests < maxRequests
    ) {
      total.requests += 1;
      stats.attempted += 1;
      const requestStartedAt = performance.now();

      try {
        const response = await fetchWithTimeout(loginUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        await response.arrayBuffer();
        stats.latencies.push(performance.now() - requestStartedAt);

        if (response.ok) {
          stats.succeeded += 1;
        } else {
          stats.failed += 1;
          stats.stopReason = `el login respondió HTTP ${response.status}`;
        }
      } catch (error) {
        stats.latencies.push(performance.now() - requestStartedAt);
        stats.failed += 1;
        stats.stopReason = error.name === 'AbortError'
          ? `una solicitud superó ${requestTimeoutMs / 1000} segundos`
          : `falló la conexión con ms.usuarios: ${error.message}`;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  const workersFinished = Promise.all(workers);

  while (
    !stats.stopReason &&
    Date.now() < deadline &&
    stats.attempted < maxRequests &&
    total.requests < maxRequests
  ) {
    await sleep(1000);
    try {
      const currentSample = await readAppMetrics();
      const elapsedSeconds = (currentSample.sampledAt - previousSample.sampledAt) / 1000;
      if (currentSample.cpuSeconds >= previousSample.cpuSeconds && elapsedSeconds > 0) {
        const cpuPercent =
          ((currentSample.cpuSeconds - previousSample.cpuSeconds) / elapsedSeconds) * 100;
        stats.peakCpuPercent = Math.max(stats.peakCpuPercent, cpuPercent);
        if (cpuPercent >= cpuLimitPercent) {
          stats.stopReason = `CPU del proceso llegó a ${cpuPercent.toFixed(1)}% de un núcleo`;
        }
      }

      stats.peakResidentMemoryBytes = Math.max(
        stats.peakResidentMemoryBytes,
        currentSample.residentMemoryBytes
      );
      const memoryPercent = (currentSample.residentMemoryBytes / memoryLimitBytes) * 100;
      if (memoryPercent >= memoryLimitPercent) {
        stats.stopReason =
          `memoria RSS del proceso llegó a ${memoryPercent.toFixed(1)}% del límite de 512 MiB`;
      }
      previousSample = currentSample;
    } catch (error) {
      stats.stopReason = `no se pudieron leer las métricas: ${error.message}`;
    }
  }

  await workersFinished;
  stats.elapsedSeconds = Math.max((Date.now() - (deadline - stageDurationSeconds * 1000)) / 1000, 0.001);
  stats.latencies.sort((a, b) => a - b);
  stats.p95Ms = percentile(stats.latencies, 95);
  stats.requestsPerSecond = stats.succeeded / stats.elapsedSeconds;

  if (!stats.stopReason && stats.failed > 0) {
    stats.stopReason = 'hubo solicitudes de login fallidas';
  }
  if (!stats.stopReason && stats.p95Ms >= latencyLimitMs) {
    stats.stopReason = `la latencia p95 llegó a ${stats.p95Ms.toFixed(0)} ms`;
  }
  stats.safetyLimitReached = total.requests >= maxRequests;
  return stats;
}

async function main() {
  let loadStarted = false;
  let highestStableConcurrency = 0;
  let firstDegradation = null;
  let safetyLimitReached = false;
  let safetyLimitConcurrency = null;
  let peakCpuPercent = 0;
  let peakResidentMemoryBytes = 0;
  const total = { requests: 0 };

  console.log('Prueba gradual de carga para ms.usuarios (solo entorno propio).');
  console.log(
    `Límites: ${maxConcurrency} ${maxConcurrency === 1 ? 'solicitud concurrente' : 'solicitudes concurrentes'}, ` +
    `${stageDurationSeconds}s por etapa, ` +
    `${maxRequests} solicitudes, 1 CPU y 512 MiB para el microservicio.`
  );
  console.log('Se detiene al detectar CPU alta, memoria elevada, latencia o errores.');

  try {
    if (!await checkReadiness()) {
      throw new Error('ms.usuarios no está listo (/metrics no respondió correctamente).');
    }
    if (!await checkLogin()) {
      throw new Error('El login de prueba falló. Verifica el correo y la contraseña antes de medir.');
    }
    loadStarted = true;

    for (const concurrency of concurrencyLevels) {
      const requestLabel = concurrency === 1 ? 'solicitud simultánea' : 'solicitudes simultáneas';
      console.log(`\nEtapa: ${concurrency} ${requestLabel} durante ${stageDurationSeconds}s.`);
      const result = await runStage(concurrency, total);
      peakCpuPercent = Math.max(peakCpuPercent, result.peakCpuPercent);
      peakResidentMemoryBytes = Math.max(
        peakResidentMemoryBytes,
        result.peakResidentMemoryBytes
      );

      console.log(
        `  ${result.attempted} solicitudes: ${result.succeeded} correctas, ${result.failed} fallidas; ` +
        `${result.requestsPerSecond.toFixed(2)} login/s; ` +
        `p95 ${result.p95Ms.toFixed(0)} ms; ` +
        `CPU pico ${result.peakCpuPercent.toFixed(1)}%; ` +
        `RSS pico ${(result.peakResidentMemoryBytes / 1024 / 1024).toFixed(1)} MiB.`
      );

      if (result.stopReason) {
        firstDegradation = { concurrency, reason: result.stopReason };
        console.log(`  Umbral detectado: ${result.stopReason}. Se detiene la escalada.`);
        break;
      }
      if (result.safetyLimitReached) {
        safetyLimitReached = true;
        safetyLimitConcurrency = concurrency;
        console.log(`  Se alcanzó el tope de seguridad de ${maxRequests} solicitudes; no se escala más.`);
        break;
      }
      highestStableConcurrency = concurrency;
    }

    console.log('\n--- Resultado ---');
    if (highestStableConcurrency > 0) {
      console.log(`Mayor concurrencia estable observada: ${highestStableConcurrency} solicitudes simultáneas.`);
    } else {
      console.log('No se completó ninguna etapa de carga estable.');
    }
    if (firstDegradation) {
      const degradedLabel = firstDegradation.concurrency === 1
        ? 'solicitud simultánea'
        : 'solicitudes simultáneas';
      console.log(
        `Primera degradación: ${firstDegradation.concurrency} ${degradedLabel} ` +
        `(${firstDegradation.reason}).`
      );
      if (firstDegradation.reason.startsWith('CPU')) {
        console.log('Primer recurso limitante observado: CPU.');
      } else if (firstDegradation.reason.startsWith('memoria')) {
        console.log('Primer recurso limitante observado: memoria del proceso.');
      } else {
        console.log('Se observó degradación, pero no se pudo atribuir solo a CPU o memoria.');
      }
    } else if (safetyLimitReached) {
      console.log(
        `No se detectó degradación antes del tope de seguridad; ` +
        `la etapa de ${safetyLimitConcurrency} ${safetyLimitConcurrency === 1 ? 'solicitud' : 'solicitudes'} ` +
        'simultáneas quedó incompleta.'
      );
    } else {
      console.log(`No se alcanzó el umbral hasta ${maxConcurrency} concurrencias.`);
    }
    console.log(`Pico CPU observado: ${peakCpuPercent.toFixed(1)}% de un núcleo.`);
    console.log(
      `Pico RSS del proceso: ${(peakResidentMemoryBytes / 1024 / 1024).toFixed(1)} MiB ` +
      `de 512 MiB disponibles para el contenedor.`
    );
    if (!firstDegradation && highestStableConcurrency === maxConcurrency) {
      console.log('La prueba llegó al máximo configurado; no significa que ese sea el límite absoluto del sistema.');
    }
  } catch (error) {
    console.error(`Prueba no completada: ${error.message}`);
    process.exitCode = 1;
  }

  if (!loadStarted) {
    console.log('No se ejecutó carga; se omitió la comprobación de recuperación.');
    return;
  }

  console.log(`\nComprobando recuperación (máximo ${recoveryTimeoutMs / 1000}s)...`);
  const recovery = await checkRecovery();
  if (recovery.recovered) {
    console.log('El endpoint de métricas y el login volvieron a responder sin reinicio manual.');
  } else {
    console.error(`El servicio no se recuperó automáticamente: ${recovery.lastError}`);
    console.error('Revisa el estado con "docker compose ps ms-usuarios" y los logs con "docker compose logs ms-usuarios".');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
