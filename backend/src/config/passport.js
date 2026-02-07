import passport from 'passport';
import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';
import axios from 'axios';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { loadSettings } from '../services/api.js';

// Passport Serialization
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await db.User.findByPk(id);
        done(null, user);
    } catch (e) {
        done(e, null);
    }
});

export const configurePassport = async () => {
    try {
        const settings = await loadSettings();
        // Check if OIDC is enabled and valid
        if (settings.oidcEnabled && settings.oidcClientId && settings.oidcIssuerUrl) {
            console.log("Configuring OIDC Strategy with issuer:", settings.oidcIssuerUrl);

            // Priority: Settings > Env (APP_URL) > Env (FRONTEND_URL) > Localhost
            const baseUrl = settings.appUrl || process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3001";
            // Ensure no trailing slash
            const cleanBaseUrl = baseUrl.replace(/\/$/, '');

            // Dynamic Discovery
            let strategyConfig = {
                issuer: settings.oidcIssuerUrl,
                authorizationURL: settings.oidcAuthorizationUrl,
                tokenURL: settings.oidcTokenUrl,
                userInfoURL: settings.oidcUserInfoUrl,
                clientID: settings.oidcClientId,
                clientSecret: settings.oidcClientSecret || "",
                // Note: callbackURL must match where the router is mounted. 
                // If mounted at /api/auth, then /oidc/callback becomes /api/auth/oidc/callback
                callbackURL: settings.oidcCallbackUrl || `${cleanBaseUrl}/api/auth/oidc/callback`,
                scope: ['openid', 'profile', 'email']
            };

            try {
                // clean issuer URL for discovery
                const issuerClean = settings.oidcIssuerUrl.replace(/\/$/, '').replace('/.well-known/openid-configuration', '');
                const discoveryUrl = `${issuerClean}/.well-known/openid-configuration`;

                console.log(`Fetching OIDC configuration from: ${discoveryUrl}`);
                const discoveryRes = await axios.get(discoveryUrl);
                const discovery = discoveryRes.data;

                if (discovery.authorization_endpoint) strategyConfig.authorizationURL = discovery.authorization_endpoint;
                if (discovery.token_endpoint) strategyConfig.tokenURL = discovery.token_endpoint;
                if (discovery.userinfo_endpoint) strategyConfig.userInfoURL = discovery.userinfo_endpoint;
                if (discovery.issuer) strategyConfig.issuer = discovery.issuer;

                console.log("OIDC Discovery successful. Using endpoints:", {
                    issuer: strategyConfig.issuer,
                    auth: strategyConfig.authorizationURL,
                    token: strategyConfig.tokenURL
                });
            } catch (discError) {
                console.warn("OIDC Discovery failed, falling back to manual/default configuration:", discError.message);
                // Fallback defaults if not set manually
                const issuerClean = settings.oidcIssuerUrl.replace(/\/$/, '').replace('/.well-known/openid-configuration', '');
                if (!strategyConfig.authorizationURL) strategyConfig.authorizationURL = `${issuerClean}/protocol/openid-connect/auth`;
                if (!strategyConfig.tokenURL) strategyConfig.tokenURL = `${issuerClean}/protocol/openid-connect/token`;
                if (!strategyConfig.userInfoURL) strategyConfig.userInfoURL = `${issuerClean}/protocol/openid-connect/userinfo`;
            }

            passport.use('oidc', new OpenIDConnectStrategy(strategyConfig, async (...args) => {
                // Robust argument handling to support different passport-openidconnect versions
                const done = args[args.length - 1]; // Last argument is always 'done'
                const profile = args.find(arg => arg && typeof arg === 'object' && (arg.id || arg.emails || arg.displayName || arg._json));

                try {
                    if (!profile) {
                        console.error("OIDC Login Failed: Could not find profile in arguments", args);
                        // If we can't find a profile, checking if any arg looks like an error
                        const errorArg = args.find(arg => arg instanceof Error);
                        if (errorArg) return done(errorArg);
                        return done(null, false, { message: "Could not retrieve user profile from IdP" });
                    }

                    // Some IdPs return properties at top level, others in _json
                    const email = profile.emails?.[0]?.value || profile._json?.email;

                    if (!email) {
                        console.error("OIDC Login Failed: No email in profile", profile);
                        return done(null, false, { message: "No email provided by IdP" });
                    }

                    let user = await db.User.findOne({ where: { email } });

                    // Try to get avatar from various standard locations
                    const avatarUrl = profile.photos?.[0]?.value || profile.picture || profile._json?.picture;

                    // Map SSO groups/roles to permissions
                    // Authentik/OIDC providers usually send 'groups' or 'roles' in the profile
                    const ssoGroups = profile._json?.groups || profile._json?.roles || [];
                    let ssoPermissions = ["request"]; // Default permission

                    // Simple mapping: if SSO group matches 'admin' or 'aurral_admin', grant admin
                    if (Array.isArray(ssoGroups)) {
                        if (ssoGroups.some(g => g === 'admin' || g === 'aurral_admin')) {
                            ssoPermissions.push('admin', 'scan');
                        }
                        if (ssoGroups.some(g => g === 'scan' || g === 'aurral_scan')) {
                            if (!ssoPermissions.includes('scan')) ssoPermissions.push('scan');
                        }
                    }

                    if (user) {
                        // Update Avatar if changed
                        let updated = false;
                        const updates = {};
                        if (avatarUrl && user.avatar !== avatarUrl) {
                            updates.avatar = avatarUrl;
                            updated = true;
                        }

                        // Sync Permissions from SSO (Override local)
                        const currentPerms = (user.permissions || []).sort().join(',');
                        const newPerms = ssoPermissions.sort().join(',');

                        if (currentPerms !== newPerms && Array.isArray(ssoGroups) && ssoGroups.length > 0) {
                            updates.permissions = ssoPermissions;
                            updated = true;
                        }

                        if (updated) await user.update(updates);

                        return done(null, user);
                    }

                    // Create new user
                    const newUser = await db.User.create({
                        id: crypto.randomUUID(),
                        username: profile.displayName || profile.username || profile._json?.preferred_username || email.split('@')[0],
                        email: email,
                        password: await bcrypt.hash(crypto.randomUUID(), 10),
                        permissions: ssoPermissions, // Use mapped permissions
                        authType: "oidc",
                        avatar: avatarUrl
                    });

                    return done(null, newUser);
                } catch (err) {
                    console.error("OIDC Verify Error:", err);
                    return done(err);
                }
            }));
        } else {
            console.log("OIDC not enabled or missing configuration.");
        }
    } catch (error) {
        console.error("Failed to configure OIDC:", error);
    }
};
