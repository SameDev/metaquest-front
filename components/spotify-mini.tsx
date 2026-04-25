import { View, Text, Pressable, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Music, SkipBack, SkipForward, Pause, Play } from 'lucide-react-native';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import type { SpotifyPlaybackState, SpotifyPlaylist } from '@/lib/spotify';

interface SpotifyMiniProps {
  isConnected: boolean;
  isReady: boolean;
  displayName: string | null;
  playback: SpotifyPlaybackState | null;
  playlists: SpotifyPlaylist[];
  onConnect: () => void;
  onDisconnect: () => void;
  onPlay: (contextUri?: string) => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const FOCUS_QUERIES = [
  { label: '🎵 Lo-fi Hip Hop', query: 'lofi hip hop study' },
  { label: '🧠 Deep Focus', query: 'deep focus concentration' },
  { label: '🌊 Ambient', query: 'ambient focus work' },
];

export function SpotifyMini({
  isConnected,
  isReady,
  displayName,
  playback,
  playlists,
  onConnect,
  onDisconnect,
  onPlay,
  onPause,
  onNext,
  onPrev,
}: SpotifyMiniProps) {
  if (!isConnected) {
    return (
      <View style={styles.card}>
        <View style={styles.disconnected}>
          <Music size={28} color="#1DB954" />
          <View style={styles.disconnectedText}>
            <Text style={styles.disconnectedTitle}>Spotify</Text>
            <Text style={styles.disconnectedSub}>Toque músicas durante o foco</Text>
          </View>
          <Pressable
            style={[styles.connectBtn, !isReady && styles.connectBtnDisabled]}
            onPress={onConnect}
            disabled={!isReady}
          >
            {!isReady ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.connectText}>Conectar</Text>
            )}
          </Pressable>
        </View>


      </View>
    );
  }

  const track = playback?.item;
  const isPlaying = playback?.is_playing ?? false;
  const albumArt = track?.album.images[0]?.url;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.spotifyConnected}>Spotify · {displayName}</Text>
        <Pressable onPress={onDisconnect}>
          <Text style={styles.disconnectText}>Desconectar</Text>
        </Pressable>
      </View>

      {/* Current track */}
      {track ? (
        <View style={styles.player}>
          {albumArt ? (
            <Image source={{ uri: albumArt }} style={styles.albumArt} />
          ) : (
            <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
              <Music size={20} color={colors.textDim} />
            </View>
          )}

          <View style={styles.trackInfo}>
            <Text style={styles.trackName} numberOfLines={1}>{track.name}</Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {track.artists.map((a) => a.name).join(', ')}
            </Text>
          </View>

          <View style={styles.controls}>
            <Pressable style={styles.ctrlBtn} onPress={onPrev}>
              <SkipBack size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={[styles.ctrlBtn, styles.playBtn]}
              onPress={() => (isPlaying ? onPause() : onPlay())}
            >
              {isPlaying
                ? <Pause size={14} color="#FFF" />
                : <Play size={14} color="#FFF" />}
            </Pressable>
            <Pressable style={styles.ctrlBtn} onPress={onNext}>
              <SkipForward size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.noTrack}>
          <Text style={styles.noTrackText}>Nenhuma música tocando</Text>
        </View>
      )}

      {/* Focus playlists */}
      {playlists.length > 0 ? (
        <View style={styles.playlists}>
          <Text style={styles.playlistsLabel}>Playlists de foco</Text>
          <View style={styles.playlistsRow}>
            {playlists.slice(0, 3).map((pl) => (
              <Pressable
                key={pl.id}
                style={styles.playlistChip}
                onPress={() => onPlay(pl.uri)}
              >
                <Text style={styles.playlistChipText} numberOfLines={1}>{pl.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.playlists}>
          <Text style={styles.playlistsLabel}>Toque no Spotify e controle aqui</Text>
          <View style={styles.playlistsRow}>
            {FOCUS_QUERIES.map((q) => (
              <Pressable key={q.query} style={styles.playlistChip}>
                <Text style={styles.playlistChipText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  disconnected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  disconnectedText: { flex: 1 },
  disconnectedTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  disconnectedSub: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  connectBtn: {
    backgroundColor: '#1DB954',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotifyConnected: {
    color: '#1DB954',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  disconnectText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  albumArt: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
  },
  albumArtPlaceholder: {
    backgroundColor: colors.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: { flex: 1 },
  trackName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  artistName: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ctrlBtn: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1DB954',
  },
  noTrack: { alignItems: 'center', paddingVertical: spacing.sm },
  noTrackText: { color: colors.textMuted, fontSize: fontSize.sm },
  playlists: { gap: spacing.sm },
  playlistsLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playlistsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  playlistChip: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 140,
  },
  playlistChipText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
