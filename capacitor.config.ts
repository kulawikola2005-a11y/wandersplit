import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wandersplit.app',
  appName: 'WanderSplit',
  webDir: 'out',
  server: {
    url: 'http://192.168.2.166:3000/trips',
    cleartext: true,
  },
};

export default config;
