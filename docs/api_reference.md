# Aurral API Map

## Base URL: `/api`

### 1. Authentication (`/auth`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/config` | `Login.jsx` | No | Returns OIDC configuration status (`{ oidcEnabled: boolean }`). |
| `POST` | `/login` | `Login.jsx` | No | Standard username/password login. Returns `token` and `user` object. |
| `GET` | `/oidc` | `Login.jsx` | No | Initiates OIDC authentication flow. Redirects to Identity Provider. |
| `GET` | `/oidc/callback`| `Login.jsx` | No | OIDC Callback URL. Redirects to frontend with token in URL query (to be fixed/secured). |
| `GET` | `/me` | `AuthContext` | Yes | Returns details of the currently authenticated user. |

### 2. Users (`/users`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | `UsersSettings` | Yes (Admin) | List all users with their request counts. Attributes: `id`, `username`, `email`, `permissions`, `avatar`. |
| `POST` | `/` | `UsersSettings` | Yes (Admin) | Create a new user. Body: `{ username, password, email, permissions }`. |
| `PUT` | `/:id` | `UsersSettings` | Yes (Admin) | Update user details (permissions, email). |
| `DELETE`| `/:id` | `UsersSettings` | Yes (Admin) | Delete a user. |
| `POST` | `/:id/avatar`| `ProfilePage` | Yes (Self/Admin)| Upload user avatar. |

### 3. Settings (`/settings`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | `SettingsPage` | Yes (Admin) | Get application configuration (Lidarr URL, Keys, etc.). |
| `PUT` | `/` | `SettingsPage` | Yes (Admin) | Update application configuration. |
| `GET` | `/system/stats`| `SettingsPage` | Yes (Admin) | Get system stats (Image Cache size, Disk usage). |
| `POST` | `/test-lidarr`| `IntegrationsTab` | Yes (Admin) | Test connection to Lidarr. Body: `{ lidarrUrl, lidarrApiKey }`. |
| `POST` | `/test-lastfm`| `IntegrationsTab` | Yes (Admin) | Test Last.fm API Key. Body: `{ lastfmApiKey }`. |
| `POST` | `/test-oidc` | `AuthTab` | Yes (Admin) | Test OIDC Discovery. Body: `{ issuerUrl }`. |

### 4. Discovery & Dashboard (`/`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/discover` | `Dashboard` | Yes | Global discovery data (Trending, Popular, Top Tags). |
| `GET` | `/discover/personal`| `Dashboard` | Yes | Personal recommendations based on user history. |
| `POST` | `/discover/refresh` | `Dashboard` | Yes (Admin) | Trigger manual refresh of global discovery cache. |

### 5. Search (`/search`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/artists` | `SearchPage` | Yes | Search for artists. Proxies to Last.fm/Lidarr. Query: `?query=...`. |
| `GET` | `/suggest` | `SearchTypeahead` | Yes | Fast autocomplete suggestions. |
| `GET` | `/recordings`| `SearchPage` | Yes | Search for specific tracks/recordings. |
| `GET` | `/albums` | `SearchPage` | Yes | Search for specific albums. |

### 6. Artists (`/artists`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/:mbid` | `ArtistDetailsPage` | Yes | Get detailed artist metadata (Bio, Albums, Similar Artists). |
| `GET` | `/:mbid/image`| `ArtistImage` | **No** | Proxy for artist images (cached locally). Public for performance/caching. |
| `GET` | `/likes` | `ProfilePage` | Yes | Get list of distinct MBIDs liked by the user. |
| `POST` | `/:mbid/like`| `LikeButton` | Yes | Toggle "Like" status for an artist. |

### 7. Requests (`/requests`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | `RequestsPage` | Yes | List all requests. Returns Artist, Status (Downloading, Imported), Requester. |
| `POST` | `/` | `AddArtistModal` | Yes | Submit new request. Body: `{ mbid, qualityProfileId, rootFolderPath }`. Adds to Lidarr. |
| `GET` | `/:id` | `RequestDetailsModal`| Yes | Get details of a specific request. |
| `DELETE`| `/:id` | `RequestsPage` | Yes (Admin) | Delete/Cancel a request. |

### 8. Lidarr Integration (`/lidarr`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/artists` | `ImportModal` | Yes | Get running list of all artists in Lidarr. |
| `GET` | `/queue` | `DownloadsPage` | Yes | Get current active download queue from Lidarr. |
| `GET` | `/qualityprofile`| `SettingsPage` | Yes | Get available quality profiles from Lidarr. |
| `GET` | `/rootfolder` | `SettingsPage` | Yes | Get available root folders from Lidarr. |
| `GET` | `/metadataprofile`| `SettingsPage` | Yes | Get available metadata profiles. |

### 9. Navidrome Integration (`/navidrome`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/config` | `IntegrationsTab` | Yes (Admin) | Save Navidrome credentials/URL. |
| `DELETE`| `/config` | `IntegrationsTab` | Yes (Admin) | Remove Navidrome integration. |
| `GET` | `/status` | `SettingsPage` | Yes (Admin) | Check connection status. |

### 10. Jobs (`/jobs`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/status` | `SystemTab` | Yes (Admin) | Get status/history of background jobs. |
| `POST` | `/discover` | `SystemTab` | Yes (Admin) | Trigger global discovery update. |
| `POST` | `/refresh-navidrome`| `SystemTab` | Yes (Admin) | Trigger Navidrome history sync. |
| `POST` | `/prefetch-images`| `SystemTab` | Yes (Admin) | Trigger image prefetch job. |

### 11. Issues (`/issues`)
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | `IssuesPage` | Yes | List reported issues. Filters: `?status=open&type=...`. |
| `POST` | `/` | `ReportIssueModal` | Yes | Report a new issue. |
| `PUT` | `/:id` | `IssueDetails` | Yes (Admin/Owner)| Update issue status (Open -> Resolved). |
| `POST` | `/:id/comment`| `IssueDetails` | Yes | Add a comment to an issue. |

### 12. General
| Method | Endpoint | Connected Component/Feature | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | `HealthCheck` | No | System health check. Returns database status, Lidarr connection, user count. |

---

## Data Models (Brief)

*   **User**: `id`, `username`, `email`, `password` (hashed), `permissions` (JSON), `navidromeConfig` (JSON).
*   **Request**: `id`, `mbid`, `artistName`, `status` (pending, approved, processing, available), `requestedByUserId`, `qualityProfileId`.
*   **Job**: `id`, `name` (discovery, sync), `lastRun`, `status`, `duration`.
*   **Issue**: `id`, `title`, `description`, `status` (open, resolved), `type`.
*   **ImageCache**: `url`, `localPath`, `blob` (optional).
