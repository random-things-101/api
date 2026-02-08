/**
 * Player DTOs with Zod validation
 */
import { z } from 'zod';

// Validation schemas
export const createPlayerSchema = z.object({
  uuid: z.string().uuid(),
  username: z.string().min(1).max(16),
  playtimeTicks: z.number().int().min(0).optional().default(0),
  firstLogin: z.string().datetime().nullable().optional(),
  lastLogin: z.string().datetime().nullable().optional(),
  isOnline: z.boolean().optional().default(false),
  additionalPermissions: z.array(z.string()).optional().nullable().default(null),
});

export const updatePlayerSchema = createPlayerSchema.partial();

export const updateOnlineStatusSchema = z.object({
  isOnline: z.boolean(),
});

export const incrementPlaytimeSchema = z.object({
  ticks: z.number().int().min(1),
});

// Type exports
export type CreatePlayerDto = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerDto = z.infer<typeof updatePlayerSchema>;
export type UpdateOnlineStatusDto = z.infer<typeof updateOnlineStatusSchema>;
export type IncrementPlaytimeDto = z.infer<typeof incrementPlaytimeSchema>;
