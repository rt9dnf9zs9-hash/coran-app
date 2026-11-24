import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { audioUrl } from '../lib/content';
import { useStore } from '../lib/store';

export const C = { primary: '#0F5C4A', soft: '#DCEFE7', softInk: '#0B4234', bg: '#FBF8F1', surface: '#FFFFFF', border: '#E8E1D0', gold: '#B8902F', goldInk: '#8A6A1E', ink: '#1F2A26', muted: '#5F6A64', error: '#B3412A', errorSoft: '#FBEAE5', errorInk: '#8A2E1C' };

export function Btn({ title, onPress, variant = 'secondary', disabled, busy, style }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; busy?: boolean; style?: ViewStyle }) {
  const primary = variant === 'primary';
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }} onPress={onPress} disabled={disabled || busy}
      style={({ pressed }) => [s.btn, primary && s.btnPrimary, variant === 'danger' && { borderColor: C.error }, pressed && { opacity: 0.85 }, (disabled || busy) && { opacity: 0.6 }, style]}>
      {busy ? <ActivityIndicator color={primary ? '#fff' : C.primary} /> : <Text style={[s.btnText, primary && { color: '#fff' }, variant === 'danger' && { color: C.error }]}>{title}</Text>}
    </Pressable>
  );
}

export function Card({ children, tone, style }: { children: ReactNode; tone?: 'soft' | 'gold' | 'err' | 'accent'; style?: ViewStyle }) {
  return <View style={[s.card, tone === 'soft' && { backgroundColor: C.soft, borderColor: C.soft }, tone === 'gold' && { borderColor: C.gold, borderWidth: 2 }, tone === 'err' && { backgroundColor: C.errorSoft, borderColor: C.errorSoft }, tone === 'accent' && { borderColor: C.primary, borderWidth: 2 }, style]}>{children}</View>;
}

/** Arabe : sens d'écriture RTL isolé, police Amiri, taille réglable. */
export function Ar({ children, size = 1, style }: { children: string; size?: number; style?: TextStyle }) {
  const { arabicScale } = useStore();
  const fs = 18 * arabicScale * size;
  return <Text style={[{ fontFamily: 'Amiri_400Regular', fontSize: fs, lineHeight: fs * 1.8, writingDirection: 'rtl', color: C.ink }, style]}>{children}</Text>;
}

export function T({ children, muted, bold, size = 16, style }: { children: ReactNode; muted?: boolean; bold?: boolean; size?: number; style?: TextStyle }) {
  return <Text style={[{ fontSize: size, lineHeight: size * 1.5, color: muted ? C.muted : C.ink, fontWeight: bold ? '700' : '400' }, style]}>{children}</Text>;
}

export function Progress({ value }: { value: number }) {
  return <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}><View style={[s.fill, { width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }]} /></View>;
}

/** Lecteur audio : écouter / répéter / vitesse. Sans enregistrement : indication, aucun son simulé. */
export function AudioBtn({ audioKey }: { audioKey?: string }) {
  const [url, setUrl] = useState<string | null | undefined>(audioKey ? undefined : null);
  const [rate, setRate] = useState(1);
  const player = useAudioPlayer(url ?? null);
  const status = useAudioPlayerStatus(player);
  useEffect(() => {
    let alive = true;
    if (audioKey) audioUrl(audioKey).then((u) => alive && setUrl(u)).catch(() => alive && setUrl(null));
    return () => { alive = false; };
  }, [audioKey]);
  if (url === null) return <T size={13} muted>Enregistrement bientôt disponible.</T>;
  if (url === undefined) return <ActivityIndicator color={C.primary} />;
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
      <Btn variant="primary" title={status.playing ? 'Pause' : 'Écouter'} onPress={() => { if (status.playing) player.pause(); else { player.setPlaybackRate(rate); if (status.didJustFinish) player.seekTo(0); player.play(); } }} />
      <Btn title="Répéter" onPress={() => { player.seekTo(0); player.setPlaybackRate(rate); player.play(); }} />
      <Btn title={rate === 1 ? '1×' : '0,75×'} onPress={() => setRate(rate === 1 ? 0.75 : 1)} />
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  btn: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnPrimary: { backgroundColor: C.primary },
  btnText: { color: C.primary, fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, gap: 6 },
  track: { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: C.primary },
  option: { minHeight: 64, borderRadius: 14, borderWidth: 2, borderColor: C.border, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', padding: 10, flexBasis: '47%', flexGrow: 1 },
});
