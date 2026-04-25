import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';
import { Platform, View, StyleSheet } from 'react-native';
import { ListTodo, Target, Footprints, BookOpen, User } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function TabIcon({ icon, focused }: { icon: React.ReactNode; focused: boolean }) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, { damping: 12, stiffness: 240 });
    translateY.value = withSpring(focused ? -2 : 0, { damping: 12, stiffness: 240 });
  }, [focused, scale, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.iconWrap, animStyle]}>
      {icon}
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 32 : 20,
          left: 20,
          right: 20,
          backgroundColor: '#1C1C34',
          borderRadius: 32,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 28,
          elevation: 18,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, React.ReactNode> = {
            index: <ListTodo size={22} color={color} />,
            focus: <Target size={22} color={color} />,
            activities: <Footprints size={22} color={color} />,
            notes: <BookOpen size={22} color={color} />,
            profile: <User size={22} color={color} />,
          };
          return <TabIcon icon={icons[route.name]} focused={focused} />;
        },
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="focus" />
      <Tabs.Screen name="activities" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="create" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
