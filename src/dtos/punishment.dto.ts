import { z } from 'zod';

/**
 * Zod schema for punishment validation
 */
export const punishmentSchema = z.object({
  id: z.number().optional(),
  playerUuid: z.string().uuid(),
  punishedByUuid: z.string().uuid().nullable(),
  punishedByName: z.string().nullable(),
  type: z.enum(['BAN', 'TEMPBAN', 'MUTE', 'TEMP_MUTE', 'KICK', 'WARN']),
  reason: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  createdAt: z.string().optional(),
  expiresAt: z.string().nullable(),
  isActive: z.boolean(),
  executed: z.boolean()
});

export type PunishmentDto = z.infer<typeof punishmentSchema>;

/**
 * Response wrappers
 */
export interface SuccessResponse {
  success: boolean;
}

export interface ExecuteResponse {
  success: boolean;
  message: string;
  kicked: boolean | null;
}
