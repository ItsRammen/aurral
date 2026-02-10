import express from "express";
import { authMiddleware, requirePermission, JWT_SECRET } from "./src/middleware/auth.js";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import axios from "axios";
// Bottleneck removed (used in services)
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import passport from 'passport';
import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';
import session from 'express-session';
import crypto from "crypto";

dotenv.config();

// GENRE_KEYWORDS moved to services/api.js

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

import { db } from "./src/config/db.js";

const app = express();
const PORT = process.env.PORT || 3001;


import {
  musicbrainzRequest,
  lastfmRequest,
  lidarrRequest,
  probeLidarrUrl,
  getCachedLidarrArtists,
  GENRE_KEYWORDS,
  LASTFM_API_KEY,
  loadSettings
} from "./src/services/api.js";
import settingsRoutes from "./src/routes/settings.routes.js";
import usersRoutes from "./src/routes/users.routes.js";
import navidromeRoutes from "./src/routes/navidrome.routes.js";
import lidarrRoutes from "./src/routes/lidarr.routes.js";
import discoveryRoutes from "./src/routes/discovery.routes.js";
import searchRoutes from "./src/routes/search.routes.js";
import artistsRoutes from "./src/routes/artists.routes.js";
import requestsRoutes from "./src/routes/requests.routes.js";
import { initScheduler } from "./src/services/scheduler.js";
import { discoveryCache, pendingPersonalDiscovery, personalDiscoveryCache, isPersonalUpdating, generatePersonalDiscovery, updateDiscoveryCache, refreshPersonalDiscoveryForAllUsers } from "./src/services/discovery.js";
import { getArtistImage } from "./src/services/images.js";



app.use(cors());
// Trust Proxy will be set based on settings
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(express.json());

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'aurral_secret_session_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

import { configurePassport } from "./src/config/passport.js";
import authRoutes from "./src/routes/auth.routes.js";

// Call initial configuration
setTimeout(configurePassport, 2000);

// Note: Passport serialization moved to src/config/passport.js but initialized here via configurePassport import side-effects? 
// No, side effects (serialization) are run when the file is imported. We need to import it.
// The configurePassport export handles the strategy. 
// We should import the file for side effects (serialization) OR move serialization into configurePassport?
// The new passport.js file has serialization at the top level. Importing it executes that.
// So just importing it is enough.

// Serve static files from the frontend build directory
const frontendDistPath = path.join(process.cwd(), "frontend", "dist");

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// Global Auth Middleware
// effectively blocks access to anything below this that isn't excluded inside the middleware itself
app.use(authMiddleware);

// Routes
app.use("/api/auth", authRoutes);



app.use("/api/users", usersRoutes);

import jobsRoutes from "./src/routes/jobs.routes.js";
import issuesRoutes from "./src/routes/issues.routes.js";

// ... existing code ...

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
});
app.use("/api/", limiter);

app.use("/api/settings", settingsRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/issues", issuesRoutes);
app.use("/api/navidrome", navidromeRoutes);
app.use("/api/lidarr", lidarrRoutes);
app.use("/api", discoveryRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/artists", artistsRoutes);
app.use("/api/requests", requestsRoutes);

// Catch-all route for SPA (must be after API routes but before error handling if any)
// This ensures that refreshing a page like /settings works by serving index.html
if (fs.existsSync(frontendDistPath)) {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

// API Helpers


app.get("/api/health", async (req, res) => {
  let lidarrStatus = "unknown";
  const settings = await loadSettings();
  const userCount = await db.User.count();
  const imageCount = await db.ImageCache.count();

  // Check for insecure default secrets
  const securityWarnings = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your-secret-key-change-this") {
    securityWarnings.push("JWT_SECRET is using an insecure default value");
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === "aurral_secret_session_key") {
    securityWarnings.push("SESSION_SECRET is using an insecure default value");
  }

  try {
    if (settings.lidarrApiKey) {
      // Small optimization: If we already have cached artists, maybe assume connected? 
      // But status check is better.
      await lidarrRequest("/system/status", "GET", null, true);
      lidarrStatus = "connected";
    } else {
      lidarrStatus = "not_configured";
    }
  } catch (error) {
    lidarrStatus = "unreachable";
  }

  res.json({
    status: "ok",
    lidarrConfigured: !!settings.lidarrApiKey,
    lidarrStatus,
    lastfmConfigured: !!settings.lastfmApiKey,
    discovery: {
      lastUpdated: discoveryCache?.lastUpdated || null,
      isUpdating: !!discoveryCache?.isUpdating,
      isPersonalUpdating: !!isPersonalUpdating,
      recommendationsCount: discoveryCache?.recommendations?.length || 0,
      globalTopCount: discoveryCache?.globalTop?.length || 0,
      cachedImagesCount: imageCount,
    },
    authRequired: userCount > 0,
    needsSetup: userCount === 0,
    securityWarnings,
    timestamp: new Date().toISOString(),
  });
});

// Routes extracted to src/routes/*.routes.js





// Discovery and Scheduler logic moved to services/discovery.js and services/scheduler.js


// [Routes moved to discovery.routes.js]





// Serve static files from the frontend build directory
// Static file serving moved to top


app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  const settings = await loadSettings();

  // Apply Trust Proxy setting
  if (settings.proxyTrusted) {
    console.log("Trust Proxy enabled (from settings).");
    app.set('trust proxy', 1);
  } else {
    console.log("Trust Proxy disabled (default).");
    app.set('trust proxy', 0);
  }

  console.log(`Lidarr URL (configured): ${settings.lidarrUrl || "http://localhost:8686"}`);

  await probeLidarrUrl();
  await probeLidarrUrl();
  initScheduler();
});

// Centralized Error Handler
import { errorHandler } from "./src/middleware/errorHandler.js";
app.use(errorHandler);