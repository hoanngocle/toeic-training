export function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/';
  // Only return to the application's learning pages.
  const path = value.split(/[?#]/)[0];
  return path === '/' || path === '/admin/users' || path === '/achievements' || path === '/tu-vung' || path.startsWith('/tu-vung/') ? value : '/';
}

export function loginDestination(path: string|null) {
  return `/login?next=${encodeURIComponent(safeReturnPath(path))}`;
}
