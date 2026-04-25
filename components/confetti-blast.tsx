import { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const COLORS = [
  '#7C3AED', '#A78BFA', '#EC4899',
  '#FBBF24', '#10B981', '#F97316',
  '#60A5FA', '#F472B6', '#34D399', '#FB923C',
];

const COUNT = 36;

interface PData {
  dx: number;
  dy: number;
  delay: number;
  color: string;
  w: number;
  h: number;
  rot: number;
  round: boolean;
}

function Particle({ p, ox, oy }: { p: PData; ox: number; oy: number }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const op = useSharedValue(1);
  const rot = useSharedValue(0);

  useEffect(() => {
    tx.value = withDelay(p.delay, withTiming(p.dx, { duration: 900, easing: Easing.out(Easing.cubic) }));
    ty.value = withDelay(p.delay, withTiming(p.dy, { duration: 900, easing: Easing.out(Easing.cubic) }));
    rot.value = withDelay(p.delay, withTiming(p.rot, { duration: 900 }));
    op.value = withDelay(p.delay + 480, withTiming(0, { duration: 420 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
    ],
    opacity: op.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: ox - p.w / 2,
          top: oy - p.h / 2,
          width: p.w,
          height: p.h,
          backgroundColor: p.color,
          borderRadius: p.round ? p.w : 2,
        },
        style,
      ]}
    />
  );
}

interface ConfettiBlastProps {
  originX?: number;
  originY?: number;
  onFinish?: () => void;
}

export function ConfettiBlast({ originX, originY, onFinish }: ConfettiBlastProps) {
  const { width: W, height: H } = Dimensions.get('window');
  const ox = originX ?? W / 2;
  const oy = originY ?? H * 0.52;

  const particles = useMemo<PData[]>(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const base = (Math.PI * 2 * i) / COUNT;
      const jitter = (Math.random() - 0.5) * 0.5;
      const angle = base + jitter;
      const dist = 110 + Math.random() * 230;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 70,
        delay: Math.floor(Math.random() * 110),
        color: COLORS[i % COLORS.length],
        w: 7 + Math.random() * 8,
        h: Math.random() > 0.4 ? 3 + Math.random() * 4 : 8 + Math.random() * 5,
        rot: Math.random() * 720 - 360,
        round: Math.random() > 0.62,
      };
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => onFinish?.(), 1450);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Particle key={i} p={p} ox={ox} oy={oy} />
      ))}
    </View>
  );
}
