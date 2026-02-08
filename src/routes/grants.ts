/**
 * Grant routes
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { grantService } from '../services/grant.service.js';
import { createGrantSchema, updateGrantActiveStatusSchema } from '../dtos/grant.dto.js';
import { authMiddleware } from '../middleware/auth.js';

const router = new Hono();

router.use('*', authMiddleware);

router.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const grant = await grantService.findById(id);
  if (!grant) return c.json({ error: 'Grant not found' }, 404);
  return c.json(grant);
});

router.get('/player/:uuid', async (c) => {
  const uuid = c.req.param('uuid');
  const grants = await grantService.findByPlayer(uuid);
  return c.json(grants);
});

router.get('/player/:uuid/active', async (c) => {
  const uuid = c.req.param('uuid');
  const grants = await grantService.findActiveByPlayer(uuid);
  return c.json(grants);
});

router.get('/player/:uuid/active-expired', async (c) => {
  const uuid = c.req.param('uuid');
  const grants = await grantService.findActiveByPlayerIncludingExpired(uuid);
  return c.json(grants);
});

router.get('/rank/:rankId', async (c) => {
  const rankId = c.req.param('rankId');
  const grants = await grantService.findByRank(rankId);
  return c.json(grants);
});

router.post('/', zValidator('json', createGrantSchema), async (c) => {
  const data = c.req.valid('json');
  const id = await grantService.save(data);
  return c.json({ success: true, id }, 201);
});

router.put('/:id/active', zValidator('json', updateGrantActiveStatusSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const { isActive } = c.req.valid('json');
  await grantService.updateActiveStatus(id, isActive);
  return c.json({ success: true });
});

router.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  await grantService.deleteById(id);
  return c.json({ success: true });
});

router.delete('/player/:uuid', async (c) => {
  const uuid = c.req.param('uuid');
  await grantService.deleteByPlayer(uuid);
  return c.json({ success: true });
});

router.post('/cleanup-expired', async (c) => {
  const count = await grantService.cleanupExpiredGrants();
  return c.json({ success: true, cleanedUp: count });
});

export default router;
