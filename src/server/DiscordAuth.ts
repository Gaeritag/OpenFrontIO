//has to be independent (security)

import axios from 'axios';
import { getServerConfigFromServer } from '../core/configuration/ConfigLoader';

const config = getServerConfigFromServer();
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = config.discordRedirectURI();
const DISCORD_API = {
  TOKEN: 'https://discord.com/api/oauth2/token',
  USER: 'https://discord.com/api/users/@me',
};
export function getDiscordAuthURL(state: string) {
  const scope = 'identify email';
  
  return `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    DISCORD_REDIRECT_URI
  )}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
}
export async function getDiscordToken(code: string) {
  try {
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: DISCORD_REDIRECT_URI,
    });

    const response = await axios.post(DISCORD_API.TOKEN, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error obtaining Discord token:', error);
    throw error;
  }
}

export async function getDiscordUser(accessToken: string) {
  try {
    const response = await axios.get(DISCORD_API.USER, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching Discord user:', error);
    throw error;
  }
}

// prevent csrf attacks
export function validateState(sessionState: string, returnedState: string): boolean {
  return sessionState === returnedState;
}
