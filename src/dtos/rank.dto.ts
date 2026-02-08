/**
 * Rank DTOs with Zod validation
 */
import { z } from 'zod';

// Validation schemas
export const createRankSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  displayName: z.string().max(100).nullable().optional(),
  prefix: z.string().max(100).nullable().optional(),
  suffix: z.string().max(100).nullable().optional(),
  priority: z.number().int().optional().default(0),
  isDefault: z.boolean().optional().default(false),
  permissions: z.array(z.string()).optional().nullable().default(null),
});

export const updateRankSchema = createRankSchema.partial();

// Type exports
export type CreateRankDto = z.infer<typeof createRankSchema>;
export type UpdateRankDto = z.infer<typeof updateRankSchema>;
