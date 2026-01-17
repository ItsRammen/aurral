---
{}
---

Always check `lidarrRequest` usage to ensure compatibility with Lidarr's API v1. Ensure `LIDARR_API_KEY` and `LIDARR_URL` are properly handled. Use existing error handling patterns in backend/server.js. When adding new Lidarr endpoints, ensure they are mirrored in `frontend/src/utils/api.js`.