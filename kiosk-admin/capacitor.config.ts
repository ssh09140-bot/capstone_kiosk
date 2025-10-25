import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gemini.kioskadmin',
  appName: 'Kiosk Admin',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  }
};

export default config;
