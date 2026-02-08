/**
 * Punishment routes - handles all punishment-related endpoints
 */
import { Hono } from 'hono';
import { punishmentService } from '../services/punishment.service.js';
import { punishmentSchema, PunishmentDto } from '../dtos/punishment.dto.js';
import { authMiddleware } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';

const punishments = new Hono();

// Apply authentication middleware to all routes
punishments.use('*', authMiddleware);

/**
 * GET /punishments/:id
 * Get punishment by ID
 */
punishments.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const punishment = await punishmentService.findById(id);

  if (!punishment) {
    return c.json({ error: 'Punishment not found' }, 404);
  }

  return c.json(punishment);
});

/**
 * GET /punishments/player/:uuid
 * Get all punishments for a player
 */
punishments.get('/player/:uuid', async (c) => {
  const playerUuid = c.req.param('uuid');
  const punishments = await punishmentService.findByPlayer(playerUuid);
  return c.json(punishments);
});

/**
 * GET /punishments/player/:uuid/active
 * Get active punishments for a player
 */
punishments.get('/player/:uuid/active', async (c) => {
  const playerUuid = c.req.param('uuid');
  const punishments = await punishmentService.findActiveByPlayer(playerUuid);
  return c.json(punishments);
});

/**
 * GET /punishments/player/:uuid/active-expired
 * Get active punishments for a player (including expired ones)
 */
punishments.get('/player/:uuid/active-expired', async (c) => {
  const playerUuid = c.req.param('uuid');
  const punishments = await punishmentService.findActiveByPlayerIncludingExpired(playerUuid);
  return c.json(punishments);
});

/**
 * POST /punishments
 * Create a new punishment
 */
punishments.post('/', zValidator('json', punishmentSchema), async (c) => {
  const data = c.req.valid('json') as PunishmentDto;

  // Set created_at if not provided
  if (!data.createdAt) {
    data.createdAt = new Date().toISOString();
  }

  // Set executed to false by default
  if (data.executed === undefined) {
    data.executed = false;
  }

  const id = await punishmentService.save(data);
  const punishment = await punishmentService.findById(id);

  return c.json(punishment, 201);
});

/**
 * PUT /punishments/:id/active
 * Update punishment active status
 */
punishments.put('/:id/active', async (c) => {
  const id = parseInt(c.req.param('id'));
  const { isActive } = await c.req.json();

  await punishmentService.updateActiveStatus(id, isActive);

  return c.json({ success: true });
});

/**
 * DELETE /punishments/:id
 * Delete punishment by ID
 */
punishments.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  await punishmentService.deleteById(id);
  return c.json({ success: true });
});

/**
 * DELETE /punishments/player/:uuid
 * Delete all punishments for a player
 */
punishments.delete('/player/:uuid', async (c) => {
  const playerUuid = c.req.param('uuid');
  await punishmentService.deleteByPlayer(playerUuid);
  return c.json({ success: true });
});

/**
 * POST /punishments/cleanup-expired
 * Mark expired punishments as inactive
 */
punishments.post('/cleanup-expired', async (c) => {
  const count = await punishmentService.cleanupExpiredPunishments();
  return c.json({ count });
});

/**
 * POST /punishments/:id/execute
 * Execute a punishment (kick player if needed)
 */
punishments.post('/:id/execute', async (c) => {
  const id = parseInt(c.req.param('id'));
  const result = await punishmentService.execute(id);
  return c.json(result);
});

export default punishments;
