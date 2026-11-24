import type { ExpoConfig } from 'expo/config';

// Identifiants : remplacez « fr.votredomaine » par un identifiant qui vous appartient
// (il ne pourra plus être changé après la première publication).
const BUNDLE_ID = process.env.APP_BUNDLE_ID ?? 'fr.votredomaine.arabeducoran';

const config: ExpoConfig = {
  name: 'Arabe du Coran',
  slug: 'arabe-du-coran',
  scheme: 'coranapp',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#FBF8F1' },
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: true,
    buildNumber: '1',
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: BUNDLE_ID,
    versionCode: 1,
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#0F5C4A' },
    permissions: [],
  },
  plugins: ['expo-router', 'expo-font', ['expo-audio', { microphonePermission: false }]],
  experiments: { typedRoutes: false },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
