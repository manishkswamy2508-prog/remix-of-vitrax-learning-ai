// @ts-nocheck
// Minimal Express-style adapter over Web Request/Response, with fair-use limits and same-origin checks.
import { AI_ROUTES, routes, type ApiRes } from './api';
import { AiError, publicMessage } from './ai/errors';
import { clientIdFrom, limiter } from './ai/limits';
import { aiLog } from './ai/log';

const MAX_BODY_BYTES = 12_000_000;

export async function handle(request: Request, path: string): Promise<Response> {
  const routeKey = `${request.method} ${path}`;
  const h = routes[routeKey];
  if (!h) return Response.json({ error: 'Not found' }, { status: 404 });

  let release = () => {};
  let body: unknown = {};
  if (request.method === 'POST') {
    // Browsers send Origin on cross-site POSTs; reject foreign origins (no CORS is offered).
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(request.url).host && !(process.env.AI_ALLOWED_ORIGINS || '').split(',').includes(origin)) {
      return Response.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
    }
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) return Response.json({ error: 'Request too large.' }, { status: 413 });
    try { body = await request.json(); } catch { return Response.json({ error: 'Request body must be JSON.' }, { status: 400 }); }
    if (AI_ROUTES.has(routeKey)) {
      try {
        release = limiter.acquire(clientIdFrom(request.headers), process.env, request.headers.get('x-request-id') || undefined);
      } catch (e) {
        const err = e instanceof AiError ? e : new AiError('local_limit', 'Please slow down.');
        aiLog('warn', 'ai.local_limit', { route: routeKey, status: err.status });
        return Response.json({ error: publicMessage(err), kind: err.kind, retryAfter: err.retryAfterMs ? Math.ceil(err.retryAfterMs / 1000) : undefined },
          { status: err.status, headers: err.retryAfterMs ? { 'Retry-After': String(Math.ceil(err.retryAfterMs / 1000)) } : {} });
      }
    }
  }

  const enc = new TextEncoder();
  const abort = new AbortController();
  request.signal.addEventListener('abort', () => abort.abort());
  return new Promise<Response>((resolve) => {
    let status = 200; const headers = new Headers(); let resolved = false;
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
    const closeHandlers: Array<() => void> = [() => abort.abort()];
    const stream = new ReadableStream<Uint8Array>({ start(c) { controller = c; }, cancel() { closeHandlers.forEach(f => f()); } });
    const flush = () => { if (!resolved) { resolved = true; resolve(new Response(stream, { status, headers })); } };
    const res: ApiRes = {
      writableEnded: false, destroyed: false,
      status(s: number) { status = s; return res; },
      setHeader(k: string, v: string) { headers.set(k, v); },
      flushHeaders() { flush(); },
      on(ev, f) { if (ev === 'close') closeHandlers.push(f); },
      write(chunk: string) { flush(); try { controller?.enqueue(enc.encode(chunk)); } catch { /* closed */ } },
      end(chunk?: string) { if (chunk) res.write(chunk); if (res.writableEnded) return; res.writableEnded = true; flush(); release(); try { controller?.close(); } catch { /* closed */ } },
      json(obj: unknown) { headers.set('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); },
    };
    Promise.resolve(h({ body, clientId: clientIdFrom(request.headers), signal: abort.signal }, res)).catch(() => {
      if (!resolved) { status = 500; res.json({ error: 'Server error' }); } else res.end();
    }).finally(() => release());
  });
}
