// deployment/frontend/health-api-route.ts
// Copy to: src/frontend/app/api/health/route.ts
// ============================================================
// RetailERP Frontend Health Check API Route (Next.js App Router)
// GET /api/health — returns service health status
// ============================================================
import { NextResponse } from 'next/server';

interface ServiceCheck {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latencyMs: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: ServiceCheck[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

async function checkService(name: string, url: string): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    return res.ok
      ? { name, status: 'up', latencyMs }
      : { name, status: 'degraded', latencyMs, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      name,
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'timeout',
    };
  }
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks = await Promise.all([
    checkService('gateway', `${API_BASE}/health`),
  ]);

  const downCount = checks.filter(s => s.status === 'down').length;
  const degraded = checks.filter(s => s.status === 'degraded').length;
  const overallStatus: HealthResponse['status'] =
    downCount > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy';

  const body: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    environment: process.env.NEXT_PUBLIC_ENV ?? 'unknown',
    uptime: process.uptime(),
    services: checks,
  };

  return NextResponse.json(body, {
    status: overallStatus === 'unhealthy' ? 503 : 200,
  });
}
