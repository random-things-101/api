# Core API

REST API for Minecraft Core plugin - manages players, grants, and ranks via a modern HTTP interface.

## Overview

This API provides a RESTful interface for the Minecraft Core plugin system, replacing direct MySQL database access with a scalable API layer. It handles player data, rank management, and grant operations for both Bukkit and BungeeCord servers.

## Features

- **RESTful API Design**: Clean HTTP endpoints with JSON request/response bodies
- **Authentication**: API key authentication via `X-API-Key` header
- **Input Validation**: Zod schema validation for all inputs
- **Database Connection Pooling**: Efficient MySQL connection management
- **Auto-initialization**: Automatically creates database tables on startup
- **Graceful Shutdown**: Proper cleanup of database connections
- **Health Check**: `/api/health` endpoint for monitoring
- **CORS Support**: Configurable CORS for cross-origin requests

## Tech Stack

- **Runtime**: Bun.js
- **Framework**: Hono
- **Database**: MySQL 8.0+
- **Validation**: Zod
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Bun.js runtime
- MySQL 8.0+ database
- Node.js 18+ (optional, for development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd core-api
```

2. Install dependencies:
```bash
bun install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# API Authentication
API_KEY=your-secret-api-key-here

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=core_db
DB_USER=core_user
DB_PASSWORD=core_password

# Connection Pool Settings
DB_CONNECTION_LIMIT=10
DB_QUEUE_LIMIT=0
```

5. Start the development server:
```bash
bun run dev
```

Or start production server:
```bash
bun run start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Authentication

All endpoints (except health check) require an API key:
```
X-API-Key: your-secret-api-key-here
```

### Players

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/players/:uuid` | Get player by UUID |
| GET | `/api/players/username/:username` | Get player by username |
| GET | `/api/players/online` | Get all online players |
| GET | `/api/players/top-playtime/:limit` | Get top players by playtime |
| POST | `/api/players` | Create/update player |
| PUT | `/api/players/:uuid/online` | Update online status |
| POST | `/api/players/:uuid/playtime` | Increment playtime |
| DELETE | `/api/players/:uuid` | Delete player |

### Grants

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grants/:id` | Get grant by ID |
| GET | `/api/grants/player/:uuid` | Get all grants for player |
| GET | `/api/grants/player/:uuid/active` | Get active grants for player |
| GET | `/api/grants/player/:uuid/active-expired` | Get active grants (including expired) |
| GET | `/api/grants/rank/:rankId` | Get all grants for rank |
| POST | `/api/grants` | Create grant |
| PUT | `/api/grants/:id/active` | Update grant active status |
| DELETE | `/api/grants/:id` | Delete grant by ID |
| DELETE | `/api/grants/player/:uuid` | Delete all grants for player |
| POST | `/api/grants/cleanup-expired` | Mark expired grants as inactive |

### Ranks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ranks/:id` | Get rank by ID |
| GET | `/api/ranks/default` | Get default rank |
| GET | `/api/ranks` | Get all ranks (ordered by priority) |
| POST | `/api/ranks` | Create/update rank |
| DELETE | `/api/ranks/:id` | Delete rank by ID |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check API health status |

## Example Requests

### Get Player by UUID
```bash
curl -H "X-API-Key: your-secret-api-key-here" \
  http://localhost:3000/api/players/123e4567-e89b-12d3-a456-426614174000
```

### Create Player
```bash
curl -X POST \
  -H "X-API-Key: your-secret-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "username": "PlayerName",
    "playtimeTicks": 0,
    "firstLogin": null,
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "isOnline": true,
    "additionalPermissions": null
  }' \
  http://localhost:3000/api/players
```

### Update Online Status
```bash
curl -X PUT \
  -H "X-API-Key: your-secret-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"isOnline": false}' \
  http://localhost:3000/api/players/123e4567-e89b-12d3-a456-426614174000/online
```

### Create Grant
```bash
curl -X POST \
  -H "X-API-Key: your-secret-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "playerUuid": "123e4567-e89b-12d3-a456-426614174000",
    "rankId": "vip",
    "granterUuid": "admin-uuid",
    "granterName": "Admin",
    "grantedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": null,
    "reason": "VIP player",
    "isActive": true
  }' \
  http://localhost:3000/api/grants
```

### Get All Ranks
```bash
curl -H "X-API-Key: your-secret-api-key-here" \
  http://localhost:3000/api/ranks
```

## Database Schema

### Players Table
```sql
CREATE TABLE players (
  uuid VARCHAR(36) PRIMARY KEY,
  username VARCHAR(16) NOT NULL,
  playtime_ticks BIGINT DEFAULT 0,
  first_login TIMESTAMP NULL,
  last_login TIMESTAMP NULL,
  is_online BOOLEAN DEFAULT FALSE,
  additional_permissions TEXT
);
```

### Grants Table
```sql
CREATE TABLE grants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_uuid VARCHAR(36) NOT NULL,
  rank_id VARCHAR(64) NOT NULL,
  granter_uuid VARCHAR(36) NOT NULL,
  granter_name VARCHAR(16) NOT NULL,
  granted_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NULL,
  reason TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_player_uuid (player_uuid),
  INDEX idx_rank_id (rank_id),
  INDEX idx_is_active (is_active),
  INDEX idx_expires_at (expires_at)
);
```

### Ranks Table
```sql
CREATE TABLE ranks (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  prefix VARCHAR(100),
  suffix VARCHAR(100),
  priority INT DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  permissions TEXT
);
```

## Project Structure

```
core-api/
├── src/
│   ├── index.ts              # Entry point
│   ├── db/
│   │   └── connection.ts     # MySQL connection pool
│   ├── routes/
│   │   ├── index.ts          # Route aggregator
│   │   ├── players.ts        # Player endpoints
│   │   ├── grants.ts         # Grant endpoints
│   │   └── ranks.ts          # Rank endpoints
│   ├── services/
│   │   ├── player.service.ts # Player business logic
│   │   ├── grant.service.ts  # Grant business logic
│   │   └── rank.service.ts   # Rank business logic
│   ├── middleware/
│   │   ├── auth.ts           # API key validation
│   │   └── error.ts          # Error handling
│   ├── dtos/
│   │   ├── player.dto.ts     # Player validation schemas
│   │   ├── grant.dto.ts      # Grant validation schemas
│   │   └── rank.dto.ts       # Rank validation schemas
│   └── types/
│       └── index.ts          # Shared types
├── package.json
├── tsconfig.json
├── bunfig.toml
└── .env.example
```

## Development

### Running in Development Mode
```bash
bun run dev
```

### Building for Production
```bash
bun run build
bun run start
```

### Running Tests
```bash
bun test
```

## Deployment

### Using PM2
```bash
pm2 start bun --name "core-api" -- src/index.ts
pm2 save
pm2 startup
```

### Using Docker (TODO)
```bash
docker build -t core-api .
docker run -p 3000:3000 --env-file .env core-api
```

## Monitoring

### Health Check
```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### API Documentation
Visit the root endpoint for available endpoints:
```bash
curl http://localhost:3000/
```

## Security

- Always use HTTPS in production
- Set a strong `API_KEY` in environment variables
- Use a firewall to restrict database access
- Implement rate limiting for production deployments
- Use environment-specific API keys for dev/staging/prod

## Performance

- Connection pooling enabled (max 10 connections by default)
- Indexed database queries for optimal performance
- Async/await for non-blocking operations
- Efficient JSON serialization/deserialization

## Troubleshooting

### Database Connection Failed
- Check MySQL is running
- Verify DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- Ensure database exists: `CREATE DATABASE core_db;`
- Check user permissions: `GRANT ALL ON core_db.* TO 'core_user'@'localhost';`

### API Key Errors
- Verify `API_KEY` is set in `.env`
- Check `X-API-Key` header is sent with requests
- Ensure no typos in API key

### Table Already Exists
The API automatically creates tables if they don't exist. If you see schema errors, ensure the tables match the schema defined in the services.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
