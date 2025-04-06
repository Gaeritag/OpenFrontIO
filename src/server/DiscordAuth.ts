import express from "express";
import fetch from "node-fetch";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { logger } from "./Logger";

const config = getServerConfigFromServer();
const log = logger.child({ component: "DiscordAuth" });

const DISCORD_API_BASE = "https://discord.com/api";

export interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    email?: string;
}

export function setupDiscordAuth(app: express.Express) {
    app.get("/api/auth/discord", (req, res) => {
        const clientId = process.env.DISCORD_CLIENT_ID;
        if (!clientId) {
            log.error("Discord client ID not configured");
            return res.status(500).json({ error: "Discord auth not configured" });
        }
        const scopes = ["identify", "email"].join(" ");
        const redirectURI = config.discordRedirectURI();
        const authURL = `${DISCORD_API_BASE}/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectURI)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
        res.redirect(authURL);
    });
    app.get("/api/auth/callback", async (req, res) => {
        const { code } = req.query;
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        const redirectURI = config.discordRedirectURI();

        if (!code || !clientId || !clientSecret) {
            log.error("Missing required OAuth parameters");
            return res.redirect("/?auth_error=missing_params");
        }

        try {
            const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: "authorization_code",
                    code: code.toString(),
                    redirect_uri: redirectURI,
                }),
            });

            if (!tokenResponse.ok) {
                const error = await tokenResponse.text();
                log.error(`Discord token exchange failed: ${error}`);
                return res.redirect("/?auth_error=token_exchange");
            }

            const tokenData = await tokenResponse.json() as {
                access_token: string;
                token_type: string;
                expires_in: number;
            };
            const userResponse = await fetch(`${DISCORD_API_BASE}/users/@me`, {
                headers: {
                    Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
                },
            });

            if (!userResponse.ok) {
                log.error("Failed to fetch Discord user profile");
                return res.redirect("/?auth_error=profile_fetch");
            }

            const userData = await userResponse.json() as DiscordUser;
            res.redirect(`/?auth_success=true&user=${encodeURIComponent(JSON.stringify({
                id: userData.id,
                username: userData.username,
                discriminator: userData.discriminator,
                avatar: userData.avatar,
                // Don't include email in the URL for privacy/security
            }))}`);

        } catch (error) {
            log.error("Discord authentication error:", error);
            res.redirect("/?auth_error=server_error");
        }
    });
}