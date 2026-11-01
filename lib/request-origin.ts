export function hasValidOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const url = new URL(request.url);
  // Next.js may build request.url with its listening hostname rather than
  // the address the browser used. Host retains that public host and port.
  const host = request.headers.get('host');
  const expectedOrigin = host ? `${url.protocol}//${host}` : url.origin;
  return origin === expectedOrigin;
}
