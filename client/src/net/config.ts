import { isNative } from '../app/native';

/** The deployed Worker (phase 16 deploy prints it; CI keeps it fixed). The APK always uses it; the web build uses its own origin. */
export const DEPLOY_URL = 'https://while-its-hot.harieedawwn.workers.dev';

/** `?server=http://127.0.0.1:8787` overrides (dev: vite on 5173, wrangler on 8787). */
export function serverBase(): string {
  const q = new URLSearchParams(location.search).get('server');
  if (q) return q.replace(/\/$/, '');
  if (isNative()) return DEPLOY_URL;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return `http://${location.hostname}:8787`;
  return location.origin;
}
