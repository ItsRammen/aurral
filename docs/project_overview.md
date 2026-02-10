# Project Overview: Aurral

## 1. System Architecture & Rundown

Aurral is a music request and discovery platform that integrates with **Lidarr** (for music management/downloads) and **Navidrome** (for streaming). It allows users to discover new music, request albums, and track their collection status.

### Core Components

1.  **Backend (Node.js/Express)**
    *   **Role**: API Server, Orchestrator.
    *   **Database**: SQLite (via Sequelize) for storing Users, Requests, Issues, and Image Cache.
    *   **Integrations**:
        *   **Lidarr**: Sources of truth for the music library. The backend proxies requests to Lidarr to search for artists and add them to the download queue.
        *   **Navidrome**: Streaming server. The backend connects to Navidrome to check if music is available for playback.
        *   **Last.fm/MusicBrainz**: Metadata providers for artist info, images, and similar artist recommendations.
        *   **OIDC Provider**: Optional external authentication (e.g., Authentik).

2.  **Frontend (React/Vite)**
    *   **Role**: User Interface.
    *   **Key Pages**:
        *   **Dashboard**: Personal recommendations and "New on Lidarr".
        *   **Search**: Unified search (Lidarr/MusicBrainz).
        *   **Requests**: Status of user requests (Pending, Downloading, Available).
        *   **Issues**: Reporting problems with metadata or audio.
        *   **Settings**: Admin configuration.

### Data Flow Example: Requesting an Album
1.  **User** searches for an Artist on Frontend.
2.  **Frontend** calls `GET /api/search/artists`.
3.  **Backend** queries Last.fm/Lidarr for matches.
4.  **User** clicks "Request" on an Artist.
5.  **Frontend** calls `POST /api/lidarr/artist`.
6.  **Backend** forwards the request to **Lidarr** to monitor the artist.
7.  **Backend** saves a `Request` record in local SQLite to track who requested it.
8.  **Lidarr** downloads the music.
9.  **SchedulerService** (Backend) periodically syncs status from Lidarr to update the `Request` status in SQLite.

---

## 2. API Reference

### Authentication (`/api/auth`)
*   `POST /login`: Standard username/password login. Returns JWT.
*   `GET /oidc`: Initiates OIDC login flow (redirects to IdP).
*   `GET /me`: Returns current user details.

### Discovery (`/api/discover`)
*   `GET /discover`: Global recommendations (Trending, Popular).
*   `GET /discover/personal`: Personalized recommendations based on user requests/likes.

### Search (`/api/search`)
*   `GET /search/artists?query=...`: Search for artists via Last.fm/Lidarr.
*   `GET /search/suggestions`: Quick autocomplete suggestions.

### Requests (`/api/requests`)
*   `GET /`: List all requests with status (Downloading, Imported, etc.).
*   `POST /`: Submit a new request (maps to Lidarr add).

### Artists (`/api/artists`)
*   `GET /:mbid`: Get detailed artist info (bio, albums, similar artists).
*   `GET /:mbid/image`: Proxy/Cache for artist images to avoid mixed content/CORS issues.
*   `POST /:mbid/like`: Toggle "Like" status for personalization.

### Lidarr Integration (`/api/lidarr`)
*   `GET /artists`: Proxy to get all artists from Lidarr.
*   `GET /queue`: Current download queue status.
*   `GET /qualityprofile`: List available quality profiles.

### Navidrome Integration (`/api/navidrome`)
*   `POST /config`: Connect to Navidrome server.
*   `GET /stream/:id`: (Conceptual) Proxy or redirect to stream url.

### Settings (`/api/settings`)
*   `GET /`: Get app configuration.
*   `POST /`: Update configuration.
*   `POST /test-lidarr`: Verify Lidarr connection.
*   `POST /test-oidc`: Verify OIDC discovery.

---

## 3. Future Development Plan

### Short Term: Polish & Reliability
- [ ] **Mobile Responsiveness**: Audit all pages for mobile layout issues (especially tables in Requests/Issues).
- [ ] **notifications**: basic in-app notifications for when a request becomes "Available".
- [ ] **OIDC Refinement**: Add role mapping (e.g., IdP Group "Admins" -> Aurral "Admin").

### Medium Term: Social & Playback
- [ ] **User Profiles**: Allow users to see each other's requests/likes (if public).
- [ ] **Comments**: Add discussion on Artist/Album pages.
- [ ] **Navidrome Playback**: Integrate a web player directly into Aurral (using Navidrome API) so users don't have to switch apps.
- [ ] **Playlists**: Create playlists based on "Aurral Recommendations" and push them to Navidrome.

### Long Term: Ecosystem
- [ ] **Native Mobile App**: Build a React Native companion app.
- [ ] **Federation**: Allow sharing recommendations between different Aurral instances.
