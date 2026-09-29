import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/components/providers/AppProvider';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { colors } from '@/constants/theme';

export { ErrorBoundary } from '@/components/ErrorBoundary';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <ThemeProvider value={navTheme}>
          <AppProvider>
            <SessionProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.bg },
                    animation: 'slide_from_right',
                  }}>
                  <Stack.Screen name="index" options={{ animation: 'fade' }} />
                  <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
                  <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
                  <Stack.Screen name="results" />
                  <Stack.Screen name="history/[id]" />
                  <Stack.Screen name="style-profile" />
                  <Stack.Screen name="privacy" />
                  <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                </Stack>
              </ToastProvider>
            </SessionProvider>
          </AppProvider>
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
