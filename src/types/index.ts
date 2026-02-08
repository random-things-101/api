/**
 * Shared type definitions for the Core API
 */

// Database row types (snake_case from MySQL)
export interface PlayerRow {
  uuid: string;
  username: string;
  playtime_ticks: number;
  first_login: string | null;
  last_login: string | null;
  is_online: boolean;
  additional_permissions: string | null;
}

export interface GrantRow {
  id: number;
  player_uuid: string;
  rank_id: string;
  granter_uuid: string;
  granter_name: string;
  granted_at: string;
  expires_at: string | null;
  reason: string | null;
  is_active: boolean;
}

export interface RankRow {
  id: string;
  name: string;
  display_name: string | null;
  prefix: string | null;
  suffix: string | null;
  priority: number;
  is_default: boolean;
  permissions: string | null;
}

export interface PunishmentRow {
  id: number;
  player_uuid: string;
  punished_by_uuid: string | null;
  punished_by_name: string | null;
  type: string;
  reason: string | null;
  duration_seconds: number | null;
  created_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  executed: boolean;
}

// API response types (camelCase for JSON)
export interface Player {
  uuid: string;
  username: string;
  playtimeTicks: number;
  firstLogin: string | null;
  lastLogin: string | null;
  isOnline: boolean;
  additionalPermissions: string[] | null;
}

export interface Grant {
  id: number;
  playerUuid: string;
  rankId: string;
  granterUuid: string;
  granterName: string;
  grantedAt: string;
  expiresAt: string | null;
  reason: string | null;
  isActive: boolean;
}

export interface Rank {
  id: string;
  name: string;
  displayName: string | null;
  prefix: string | null;
  suffix: string | null;
  priority: number;
  isDefault: boolean;
  permissions: string[] | null;
}

export interface Punishment {
  id: number;
  playerUuid: string;
  punishedByUuid: string | null;
  punishedByName: string | null;
  type: string;
  reason: string | null;
  durationSeconds: number | null;
  createdAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  executed: boolean;
}

// Create DTO types (for API requests)
export type CreatePlayerDto = Omit<Player, 'uuid'> & { uuid: string };
export type CreateGrantDto = Omit<Grant, 'id'>;
export type CreateRankDto = Omit<Rank, 'id'> & { id: string };

// Helper to convert database row to API response
export function playerRowToApi(row: PlayerRow): Player {
  return {
    uuid: row.uuid,
    username: row.username,
    playtimeTicks: row.playtime_ticks,
    firstLogin: row.first_login,
    lastLogin: row.last_login,
    isOnline: row.is_online,
    additionalPermissions: row.additional_permissions
      ? row.additional_permissions.split(',').filter(p => p.trim())
      : null,
  };
}

export function grantRowToApi(row: GrantRow): Grant {
  return {
    id: row.id,
    playerUuid: row.player_uuid,
    rankId: row.rank_id,
    granterUuid: row.granter_uuid,
    granterName: row.granter_name,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    reason: row.reason,
    isActive: row.is_active,
  };
}

export function rankRowToApi(row: RankRow): Rank {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    prefix: row.prefix,
    suffix: row.suffix,
    priority: row.priority,
    isDefault: row.is_default,
    permissions: row.permissions
      ? row.permissions.split(',').filter(p => p.trim())
      : null,
  };
}

// Helper to convert API request to database row
export function playerApiToRow(player: Partial<Player>): Partial<PlayerRow> {
  const row: Partial<PlayerRow> = {
    uuid: player.uuid,
    username: player.username,
    playtime_ticks: player.playtimeTicks,
    first_login: player.firstLogin,
    last_login: player.lastLogin,
    is_online: player.isOnline,
    additional_permissions: player.additionalPermissions?.join(',') || null,
  };
  return row;
}

export function grantApiToRow(grant: Partial<Grant>): Partial<GrantRow> {
  const row: Partial<GrantRow> = {
    id: grant.id,
    player_uuid: grant.playerUuid,
    rank_id: grant.rankId,
    granter_uuid: grant.granterUuid,
    granter_name: grant.granterName,
    granted_at: grant.grantedAt,
    expires_at: grant.expiresAt,
    reason: grant.reason,
    is_active: grant.isActive,
  };
  return row;
}

export function rankApiToRow(rank: Partial<Rank>): Partial<RankRow> {
  const row: Partial<RankRow> = {
    id: rank.id,
    name: rank.name,
    display_name: rank.displayName,
    prefix: rank.prefix,
    suffix: rank.suffix,
    priority: rank.priority,
    is_default: rank.isDefault,
    permissions: rank.permissions?.join(',') || null,
  };
  return row;
}

export function punishmentRowToApi(row: PunishmentRow): Punishment {
  return {
    id: row.id,
    playerUuid: row.player_uuid,
    punishedByUuid: row.punished_by_uuid,
    punishedByName: row.punished_by_name,
    type: row.type,
    reason: row.reason,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    executed: row.executed,
  };
}

export function punishmentApiToRow(punishment: Partial<Punishment>): Partial<PunishmentRow> {
  const row: Partial<PunishmentRow> = {
    id: punishment.id,
    player_uuid: punishment.playerUuid,
    punished_by_uuid: punishment.punishedByUuid,
    punished_by_name: punishment.punishedByName,
    type: punishment.type,
    reason: punishment.reason,
    duration_seconds: punishment.durationSeconds,
    created_at: punishment.createdAt,
    expires_at: punishment.expiresAt,
    is_active: punishment.isActive,
    executed: punishment.executed,
  };
  return row;
}
