import { Tabs } from 'expo-router/js-tabs';
import React from 'react';

import { TabBar } from '@/components/TabBar';
import { colors } from '@/theme';

/** Barra inferior de cinco destinos: Hoy · Explorar · En Vivo · La Red · Mi Camino. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.night },
      }}
    >
      <Tabs.Screen name="hoy" options={{ title: 'Hoy' }} />
      <Tabs.Screen name="explorar" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="en-vivo" options={{ title: 'En Vivo' }} />
      <Tabs.Screen name="la-red" options={{ title: 'La Red' }} />
      <Tabs.Screen name="mi-camino" options={{ title: 'Mi Camino' }} />
    </Tabs>
  );
}
