/**
 * Grant DTOs with Zod validation
 */
import { z } from 'zod';

// Validation schemas
export const createGrantSchema = z.object({
  playerUuid: z.string().uuid(),
  rankId: z.string().min(1),
  granterUuid: z.string().uuid(),
  granterName: z.string().min(1).max(16),
  grantedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateGrantActiveStatusSchema = z.object({
  isActive: z.boolean(),
});

// Type exports
export type CreateGrantDto = z.infer<typeof createGrantSchema>;
export type UpdateGrantActiveStatusDto = z.infer<typeof updateGrantActiveStatusSchema>;
