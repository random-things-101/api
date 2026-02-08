/**
 * API key authentication middleware
 */
import { Context, Next } from 'hono';

const API_KEY = process.env.API_KEY || '';

if (!API_KEY) {
  console.warn('⚠️  WARNING: API_KEY not set in environment variables!');
}

export const authMiddleware = async (c: Context, next: Next) => {
  const apiKey = c.req.header('X-API-Key');

  if (!API_KEY) {
    // If no API key is configured, allow all requests (development mode)
    console.warn('⚠️  No API key configured - allowing all requests');
    await next();
    return;
  }

  if (!apiKey) {
    return c.json({ error: 'Unauthorized: Missing API key' }, 401);
  }

  if (apiKey !== API_KEY) {
    return c.json({ error: 'Unauthorized: Invalid API key' }, 401);
  }

  await next();
};
