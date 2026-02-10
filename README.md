# Aurral

<p align="center">
  <img src="frontend/public/arralogo.svg" width="128" height="128" alt="Aurral Logo">
</p>

<p align="center">
  <strong>Streamlined Artist Request Manager & Discovery Platform for Lidarr</strong>
</p>

---

## What is Aurral?

Aurral is a modern web application that bridges the gap between music discovery, request management, and your **Lidarr** library. It allows users to search for artists, request them for download, and stream them via **Navidrome** integration—all in one unified interface.

Think of it as the missing link between *wanting* music (Discovery/Requests) and *listening* to music (Navidrome), powered by Lidarr's library management.

---

## Features

### 🔍 Search & Discovery
- **Unified Search:** Search MusicBrainz, Last.fm, and your local Lidarr library simultaneously.
- **Smart Recommendations:** "Personal Discovery" engine analyzes your requests and suggests similar artists.
- **Trending & Popular:** See what's hot globally across Last.fm.

### 📥 Request Management
- **Seamless Lidarr Integration:** One-click requests that instantly add artists to Lidarr.
- **Status Tracking:** Monitor specific albums/artists from "Pending" to "Downloading" to "Available".
- **Quality Profiles:** Choose specific quality profiles (e.g., "Any", "Lossless") when requesting.

### 🎧 Streaming Integration
- **Navidrome Status:** See if an artist is available to stream on your Navidrome server.
- **Deep Links:** Jump directly to the artist in Navidrome or Lidarr.

### 🛡️ Security & Administration
- **OIDC Authentication:** Full support for OpenID Connect (Authentik, Keycloak, etc.).
- **Role-Based Access:** Granular permissions for Admins vs. Standard Users.
- **Issue Tracking:** Users can report metadata or audio issues directly within the app.

---

## Documentation

Comprehensive documentation is available in the `docs/` directory:
*   [**Project Overview**](docs/project_overview.md): System architecture and data flow.
*   [**API Reference**](docs/api_reference.md): Detailed API endpoint map.

---

## Quick Start (Docker)

### 1. Setup
```bash
git clone https://github.com/lklynet/aurral.git
cd aurral
cp .env.example .env
```

### 2. Configure
Edit `.env` with your core settings:
```env
LIDARR_URL=http://your-lidarr-ip:8686
LIDARR_API_KEY=your_api_key
JWT_SECRET=secure-random-string
SESSION_SECRET=another-secure-random-string
```

### 3. Run
```bash
docker-compose up -d
```
Access the UI at `http://localhost:3000`.

---

## Configuration Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LIDARR_URL` | Full URL to your Lidarr instance | `required` |
| `LIDARR_API_KEY` | Your Lidarr API Key | `required` |
| `JWT_SECRET` | Secret for signing auth tokens | `change_me` |
| `SESSION_SECRET` | Secret for session cookies | `change_me` |
| `LASTFM_API_KEY` | (Optional) For artist images/bio | `null` |
| `NODE_ENV` | `development` or `production` | `development` |

*Note: OIDC and Navidrome settings are configured via the Web UI (Admin Settings).*

---

## Troubleshooting

- **OIDC 404:** Ensure your Issuer URL does not end in `.well-known/...`. Just the base issuer URL is needed.
- **Missing Images:** Get a free API key from Last.fm and add it to `.env` or Settings for rich artist artwork.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
