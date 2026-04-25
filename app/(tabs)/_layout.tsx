import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { colors, radius } from '@/constants/theme';
import { Platform, View, StyleSheet } from 'react-native';
import { ListTodo, Target, PlusCircle, BookOpen, User } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function TabIcon({ icon, focused }: { icon: React.ReactNode; focused: boolean }) {
  const scale = useSharedValue(focused ? 1 : 0.8);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.8, { damping: 13, stiffness: 220 });
  }, [focused, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.iconWrap, focused && styles.iconActive, animStyle]}>
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
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
        },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, React.ReactNode> = {
            index: <ListTodo size={22} color={color} />,
            focus: <Target size={22} color={color} />,
            create: <PlusCircle size={22} color={color} />,
            notes: <BookOpen size={22} color={color} />,
            profile: <User size={22} color={color} />,
          };
          return <TabIcon icon={icons[route.name]} focused={focused} />;
        },
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="focus" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 48,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: colors.accent,
  },
});
