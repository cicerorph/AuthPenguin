# AuthPenguin Server - Organized Structure

## Overview
This is the AuthPenguin server with security, modular architecture, and admin controls.

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js      # Redis configuration
│   │   └── passport.js      # Passport.js configuration
│   ├── middleware/
│   │   └── auth.js         # Authentication & security middleware
│   ├── routes/
│   │   ├── admin.js        # Admin management routes
│   │   ├── auth.js         # General auth routes
│   │   ├── oauth.js        # OAuth provider routes
│   │   ├── scratch.js      # Scratch authentication
│   │   └── soundcloud.js   # SoundCloud authentication
│   ├── strategies/
│   │   ├── scratch.js      # Custom Scratch strategy
│   │   └── soundcloud.js   # Custom SoundCloud strategy
│   └── utils/
│       └── admin.js        # Admin utility functions
├── public/
│   ├── admin.html          # Admin dashboard
│   ├── auth-selector.html  # OAuth provider selector
│   ├── index.html          # Main landing page
│   ├── privacy.html        # Privacy policy
│   ├── scratch-auth.html   # Scratch authentication page
│   └── terms.html          # Terms of service
├── server.js               # server file
└── package.json
```

## Features

### 1. Security
- **Origin Validation**: Only allows requests from trusted origins (TurboWarp, PenguinMod, localhost) (Not actually sure if it works right now)
- **Rate Limiting**: Prevents abuse with configurable rate limits
- **Project Blocking**: Ability to block specific projects from using OAuth
- **Admin Authentication**: Secure admin panel with key-based authentication

### 2. Project Blocking System (Not actually sure if it works right now)
- Block projects by ID or shared project URLs
- Support for both regular projects and shared projects (PenguinMod URLs)
- Admin dashboard for managing blocked projects
- Reason tracking for blocks with timestamps

### 3. Organized Architecture
- Modular route structure
- Separated middleware and utilities
- Configuration files for easy maintenance
- Proper error handling and logging

## Environment Variables

Add these to your `.env` file:

```env
# Existing variables...
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
SOUNDCLOUD_CLIENT_SECRET=your_soundcloud_client_secret
REDIS_URL=redis://localhost:6379
BASE_URL=http://localhost:3000
SESSION_SECRET=your_session_secret

# New variables
ADMIN_KEY=your_secure_admin_key
NODE_ENV=development
```

## API Endpoints

### Authentication Endpoints
- `GET /auth/selector` - OAuth provider selector page
- `GET /auth/discord` - Discord OAuth
- `GET /auth/google` - Google OAuth
- `GET /auth/github` - GitHub OAuth
- `GET /auth/scratch` - Scratch authentication page
- `GET /auth/soundcloud` - SoundCloud OAuth
- `GET /auth/status` - Check authentication status
- `POST /auth/logout` - Logout user
- `GET /auth/failure` - Authentication failure handler

### Admin Endpoints (Requires Admin Key)
- `POST /admin/block` - Block a project
- `POST /admin/unblock` - Unblock a project
- `GET /admin/blocked` - List blocked projects
- `GET /admin/status` - Check project block status (public, rate-limited)

### Security Headers Required
- `X-Project-Id`: Project identifier (required for all auth requests)
- `X-Admin-Key`: Admin key (required for admin endpoints)
- `Origin`: Request origin (validated against whitelist)

## Usage

### Starting the Server
```bash
# Install dependencies
npm install
# or
bun install

# Start the server
node server.js
# or
bun run server.js
```

### Admin Dashboard
Access the admin dashboard at `http://localhost:3000/admin.html`

### Blocking Projects
Projects can be blocked in two ways:
1. **Regular Projects**: Use the project ID
2. **Shared Projects**: Use the shared project ID from URLs like `https://studio.penguinmod.com/#4643884053`

### Security Notes
- All authentication requests require a valid `X-Project-Id` header
- Origins are validated against a whitelist
- Rate limiting is applied to prevent abuse
- Admin endpoints require the `ADMIN_KEY` environment variable

## Development

The server includes:
- nothing
- try and error type of project lmaoooo (i might change it)
