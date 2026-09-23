import app from '../server/app.js';

export default function handler(req, res) {
  // Normalize req.url to match Express routes mounted at /api/*
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/health')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
