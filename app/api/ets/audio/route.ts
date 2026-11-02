import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { requireApiUser } from '../../../../lib/auth-server';
import { audioPath, parseAudioRange } from '../../../../lib/ets/audio';
import { accountFailure } from '../../../../lib/accounts/http';
import { AccountError } from '../../../../lib/accounts/policy';

export async function GET(request: Request) {
  try {
    if (!await requireApiUser()) throw new AccountError('Vui lòng đăng nhập.', 401);
    const params = new URL(request.url).searchParams;
    const path = audioPath(Number(params.get('test')), Number(params.get('part') ?? '0'));
    if (!path) throw new AccountError('Không tìm thấy audio.', 404);
    let size: number;
    try { size = (await stat(path)).size; } catch { throw new AccountError('Audio chưa có trên máy chủ.', 404); }
    const headers = new Headers({ 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    const range = request.headers.get('range');
    if (range) {
      const bounds = parseAudioRange(range, size);
      if (!bounds) { headers.set('Content-Range', `bytes */${size}`); return new Response(null, { status: 416, headers }); }
      headers.set('Content-Range', `bytes ${bounds.start}-${bounds.end}/${size}`);
      headers.set('Content-Length', String(bounds.end - bounds.start + 1));
      return new Response(Readable.toWeb(createReadStream(path, bounds)) as ReadableStream<Uint8Array>, { status: 206, headers });
    }
    headers.set('Content-Length', String(size));
    return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>, { headers });
  } catch (error) { return accountFailure(error); }
}
