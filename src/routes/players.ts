/**
 * Player routes
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { playerService } from '../services/player.service.js';
import { createPlayerSchema, updateOnlineStatusSchema, incrementPlaytimeSchema } from '../dtos/player.dto.js';
import { authMiddleware } from '../middleware/auth.js';

const router = new Hono();

// Apply auth middleware to all routes
router.use('*', authMiddleware);

/**
 * GET /api/players/online
 * Get all online players
 * NOTE: Must come before /:uuid route to avoid conflicts
 */
router.get('/online', async (c) => {
  const players = await playerService.findOnlinePlayers();
  return c.json(players);
});

/**
 * GET /api/players/username/:username
 * Get player by username
 * NOTE: Must come before /:uuid route to avoid conflicts
 */
router.get('/username/:username', async (c) => {
  const username = c.req.param('username');
  const player = await playerService.findByUsername(username);

  if (!player) {
    return c.json({ error: 'Player not found' }, 404);
  }

  return c.json(player);
});

/**
 * GET /api/players/top-playtime/:limit
 * Get top players by playtime
 * NOTE: Must come before /:uuid route to avoid conflicts
 */
router.get('/top-playtime/:limit', async (c) => {
  const limit = parseInt(c.req.param('limit') || '10');
  const players = await playerService.findTopByPlaytime(limit);
  return c.json(players);
});

/**
 * GET /api/players/:uuid
 * Get player by UUID
 */
router.get('/:uuid', async (c) => {
  const uuid = c.req.param('uuid');
  const player = await playerService.findByUuid(uuid);

  if (!player) {
    return c.json({ error: 'Player not found' }, 404);
  }

  return c.json(player);
});

/**
 * POST /api/players
 * Create or update player
 */
router.post('/', zValidator('json', createPlayerSchema), async (c) => {
  const data = c.req.valid('json');
  await playerService.save(data);
  return c.json({ success: true }, 201);
});

/**
 * PUT /api/players/:uuid/online
 * Update player online status
 */
router.put('/:uuid/online', zValidator('json', updateOnlineStatusSchema), async (c) => {
  const uuid = c.req.param('uuid');
  const { isOnline } = c.req.valid('json');
  await playerService.updateOnlineStatus(uuid, isOnline);
  return c.json({ success: true });
});

/**
 * POST /api/players/:uuid/playtime
 * Increment player playtime
 */
router.post('/:uuid/playtime', zValidator('json', incrementPlaytimeSchema), async (c) => {
  const uuid = c.req.param('uuid');
  const { ticks } = c.req.valid('json');
  await playerService.incrementPlaytime(uuid, ticks);
  return c.json({ success: true });
});

/**
 * DELETE /api/players/:uuid
 * Delete player
 */
router.delete('/:uuid', async (c) => {
  const uuid = c.req.param('uuid');
  await playerService.deleteByUuid(uuid);
  return c.json({ success: true });
});

export default router;
