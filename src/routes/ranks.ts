/**
 * Rank routes
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { rankService } from '../services/rank.service.js';
import { createRankSchema } from '../dtos/rank.dto.js';
import { authMiddleware } from '../middleware/auth.js';

const router = new Hono();

router.use('*', authMiddleware);

router.get('/default', async (c) => {
  const rank = await rankService.findDefaultRank();
  if (!rank) return c.json({ error: 'Default rank not found' }, 404);
  return c.json(rank);
});

router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const rank = await rankService.findById(id);
  if (!rank) return c.json({ error: 'Rank not found' }, 404);
  return c.json(rank);
});

router.get('/', async (c) => {
  const ranks = await rankService.findAll();
  return c.json(ranks);
});

router.post('/', zValidator('json', createRankSchema), async (c) => {
  const data = c.req.valid('json');
  await rankService.save(data);
  return c.json({ success: true }, 201);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await rankService.deleteById(id);
  return c.json({ success: true });
});

export default router;
