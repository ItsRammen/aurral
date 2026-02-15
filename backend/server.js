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

// Trust Proxy Configuration
// Must be set before session middleware for secure cookies to work behind proxies
if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
} else {
  // Default to 0 (disabled) unless explicitly enabled via ENV or settings later.
  // Note: Express-session needs this set correctly for 'secure: auto' or 'secure: true' behind proxies.
}

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'aurral_secret_session_key',
  resave: false,
  saveUninitialized: false, // Don't create session until something stored
  cookie: {
    secure: process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax' // Required for OIDC redirects to work
  },
  // proxy: true // Let express-session look at req.protocol/trust proxy settings
}));

// Debug Middleware for Sessions (Temporary)
app.use((req, res, next) => {
  if (process.env.DEBUG === 'true') {
    console.log(`[Session Debug] ${req.method} ${req.url} | SessionID: ${req.sessionID} | HasSession: ${!!req.session} | User: ${req.user?.id}`);
  }
  next();
});

app.use(passport.initialize());
app.use(passport.session());

import { configurePassport } from "./src/config/passport.js";
import authRoutes from "./src/routes/auth.routes.js";

// Call initial configuration
setTimeout(configurePassport, 2000);

// Serve static files from the frontend build directory
const frontendDistPath = path.join(process.cwd(), "frontend", "dist");

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// Global Auth Middleware
// effectively blocks access to anything below this that isn't excluded inside the middleware itself
app.use(authMiddleware);

// Strict rate limiter for login endpoint (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", loginLimiter);

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

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  const settings = await loadSettings();

  // Apply Trust Proxy setting
  if (settings.proxyTrusted) {
    console.log("Trust Proxy enabled (from settings).");
    app.set('trust proxy', 1);
  } else {
    // Check Config first, then Env fallback checked above
    if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
      console.log("Trust Proxy enabled (from ENV).");
      // Already set above
    } else {
      console.log("Trust Proxy disabled (default).");
      app.set('trust proxy', 0);
    }
  }

  console.log(`Lidarr URL (configured): ${settings.lidarrUrl || "http://localhost:8686"}`);

  await probeLidarrUrl();
  initScheduler();
});

// Centralized Error Handler
import { errorHandler } from "./src/middleware/errorHandler.js";
app.use(errorHandler);

// Graceful Shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    server.close(() => {
      console.log('HTTP server closed.');
    });
    await db.sequelize.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));