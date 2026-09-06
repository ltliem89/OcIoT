// api/index.ts
// Vercel Serverless Function entry point wrapping Express backend
import type { Request, Response } from 'express';
import app from '../server.ts';

export default function handler(req: Request, res: Response) {
  const forwardedUri = (req.headers['x-forwarded-uri'] as string) || (req.headers['x-matched-path'] as string);
  const currentUrl = req.url || '/';

  if (currentUrl === '/api/index.ts' || currentUrl === '/api' || currentUrl === '/api/') {
    if (forwardedUri && forwardedUri.startsWith('/api/')) {
      req.url = forwardedUri;
    }
  } else if (!currentUrl.startsWith('/api') && currentUrl.startsWith('/v1')) {
    req.url = '/api' + currentUrl;
  }

  return app(req, res);
}
