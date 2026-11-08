import type { CapacitorConfig } from '@capacitor/cli';

/**
 * MinSU FoundIt! - Capacitor Configuration
 * Mindoro State University - Victoria Campus Capstone Project
 * Targets: Android (APK/AAB) & iOS (IPA) + Web PWA
 */
const config: CapacitorConfig = {
  appId: 'ph.edu.minsu.foundit',
  appName: 'MinSU FoundIt!',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#005A36',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#FFC72C',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#005A36',
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
    Geolocation: {
      permissions: ['location'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_minsu',
      iconColor: '#005A36',
      sound: 'beep.wav',
    },
  },
};

export default config;
