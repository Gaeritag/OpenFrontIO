// src/server/AuthRoutes.ts
import express from 'express';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { getServerConfigFromServer } from '../core/configuration/ConfigLoader';
import { Database } from './db/DB';
import pool from './db/Index';
import { logger } from './Logger';
import { gatekeeper, LimiterType } from './Gatekeeper';
import crypto from 'crypto';
import querystring from 'querystring';

const router = express.Router();
const config = getServerConfigFromServer();
const log = logger.child({ component: 'AuthRoutes' });
const db = new Database(pool);

// Discord OAuth2 configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_REDIRECT_URI = config.discordRedirectURI();
const DISCORD_API_URL = 'https://discord.com/api/v10';

// Cookie settings
const COOKIE_NAME = 'game_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_SECURE = true; //set to flase for dev

//csrf stuff
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}
router.get(
  '/discord', 
  gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
    try {
      
      const state = generateState();
      res.cookie('discord_oauth_state', state, {
        maxAge: 10 * 60 * 1000, //set to 10 minutes
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: 'lax'
      });
      const authorizeUrl = `${DISCORD_API_URL}/oauth2/authorize?${querystring.stringify({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify',
        state: state
      })}`;
      
      res.redirect(authorizeUrl);
    } catch (error) {
      log.error('Error initiating Discord OAuth:', error);
      res.status(500).json({ error: 'Failed to initiate authentication' });
    }
  })
);
router.get(
  '/discord/callback',
  gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
    try {
      const { code, state } = req.query as { code: string; state: string };
      const storedState = req.cookies?.discord_oauth_state;
      if (!state || !storedState || state !== storedState) {
        log.warn('OAuth state mismatch - possible CSRF attempt');
        return res.status(403).json({ error: 'Invalid state parameter' });
      }
      res.clearCookie('discord_oauth_state');
      const tokenResponse = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: querystring.stringify({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: DISCORD_REDIRECT_URI
        })
      });
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        log.error('Discord token exchange error:', errorData);
        return res.status(500).json({ error: 'Failed to exchange token' });
      }
      const tokenData = await tokenResponse.json();
      const { access_token } = tokenData;
      const userResponse = await fetch(`${DISCORD_API_URL}/users/@me`, {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      
      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        log.error('Discord user info error:', errorData);
        return res.status(500).json({ error: 'Failed to fetch user information' });
      }
      
      const userData = await userResponse.json();
      const sessionId = uuidv4();
      await db.upsertSession({
        discord_id: userData.id,
        session_id: sessionId,
        metadata: {
          username: userData.username,
          avatar: userData.avatar,
          discriminator: userData.discriminator
        }
      });
      res.cookie(COOKIE_NAME, sessionId, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: 'lax'
      });
      const redirectUrl = req.cookies?.auth_redirect || '/';
      res.clearCookie('auth_redirect');
      res.redirect(redirectUrl);
    } catch (error) {
      log.error('Error in Discord OAuth callback:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  })
);
router.get(
  '/status',
  gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
    try {
      const sessionId = req.cookies?.[COOKIE_NAME];
      
      if (!sessionId) {
        return res.json({ loggedIn: false });
      }
      
      const session = await db.getSession(sessionId);
      
      if (!session) {
        res.clearCookie(COOKIE_NAME);
        return res.json({ loggedIn: false });
      }
      return res.json({
        loggedIn: true,
        sessionId: session.session_id,
        username: session.metadata?.username || 'User',
        discordId: session.discord_id
      });
    } catch (error) {
      log.error('Error checking authentication status:', error);
      res.status(500).json({ error: 'Failed to check authentication status' });
    }
  })
);
router.post(
  '/logout',
  gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
    try {
      const sessionId = req.cookies?.[COOKIE_NAME];
      
      if (sessionId) {
        await db.deleteSession(sessionId);
        res.clearCookie(COOKIE_NAME);
      }
      
      res.json({ success: true });
    } catch (error) {
      log.error('Error during logout:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  })
);

export default router;
