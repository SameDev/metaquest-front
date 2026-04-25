import { useCallback, useEffect, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_SCOPES,
  saveSpotifySession,
  clearSpotifySession,
  getSpotifyAccessToken,
  spotifyApi,
} from '@/lib/spotify';
import { useSpotifyStore } from '@/stores/spotify-store';

WebBrowser.maybeCompleteAuthSession();

const isExpoGo = Constants.appOwnership === 'expo';

// Dev (Expo Go): add  exp://localhost:8081/--/spotify-callback  to Spotify Dashboard
// Production:   add  disciplineos://spotify-callback  to Spotify Dashboard
export const REDIRECT_URI = isExpoGo
  ? 'exp://localhost:8081/--/spotify-callback'
  : 'disciplineos://spotify-callback';

async function generatePKCE() {
  const raw = Crypto.randomUUID() + Crypto.randomUUID();
  const verifier = raw.replace(/-/g, '').slice(0, 64);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return { verifier, challenge };
}

export function useSpotify() {
  const { isConnected, displayName, playback, setConnected, setPlayback, disconnect } =
    useSpotifyStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPlayback = useCallback(async () => {
    try {
      const state = await spotifyApi.getPlayback();
      setPlayback(state?.item ? state : null);
    } catch {
      setPlayback(null);
    }
  }, [setPlayback]);

  // Check existing session on mount
  useEffect(() => {
    getSpotifyAccessToken().then(async (token) => {
      if (!token) return;
      try {
        const me = await spotifyApi.getMe();
        setConnected(me.display_name);
        fetchPlayback();
      } catch {
        await clearSpotifySession();
      }
    });
  }, []);

  // Poll playback every 5s when connected
  useEffect(() => {
    if (!isConnected) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(fetchPlayback, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isConnected, fetchPlayback]);

  const connect = useCallback(async () => {
    if (!SPOTIFY_CLIENT_ID) {
      console.warn('EXPO_PUBLIC_SPOTIFY_CLIENT_ID not set');
      return;
    }

    const { verifier, challenge } = await generatePKCE();
    const state = Math.random().toString(36).slice(2, 10);

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
      scope: SPOTIFY_SCOPES.join(' '),
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type !== 'success') return;

    const url = new URL(result.url);
    const code = url.searchParams.get('code');
    if (!code) return;

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier,
      }).toString(),
    });

    const json = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Token exchange failed:', json);
      return;
    }

    await saveSpotifySession(json.access_token, json.refresh_token ?? '', json.expires_in);
    const me = await spotifyApi.getMe();
    setConnected(me.display_name);
    fetchPlayback();
  }, [setConnected, fetchPlayback]);

  const handleDisconnect = useCallback(async () => {
    await clearSpotifySession();
    disconnect();
  }, [disconnect]);

  const play = useCallback(async (contextUri?: string) => {
    try { await spotifyApi.play(contextUri); } catch { return; }
    setTimeout(fetchPlayback, 500);
  }, [fetchPlayback]);

  const pause = useCallback(async () => {
    try { await spotifyApi.pause(); } catch { return; }
    setTimeout(fetchPlayback, 500);
  }, [fetchPlayback]);

  const next = useCallback(async () => {
    try { await spotifyApi.next(); } catch { return; }
    setTimeout(fetchPlayback, 800);
  }, [fetchPlayback]);

  const prev = useCallback(async () => {
    try { await spotifyApi.prev(); } catch { return; }
    setTimeout(fetchPlayback, 800);
  }, [fetchPlayback]);

  return {
    isConnected,
    displayName,
    playback,
    isReady: true,
    connect,
    disconnect: handleDisconnect,
    play,
    pause,
    next,
    prev,
    fetchPlayback,
  };
}
