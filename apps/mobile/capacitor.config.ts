import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.gitswipe.mobile",
  appName: "GitSwipe",
  webDir: "../daemon/public",
  server: {
    cleartext: true,
  },
};

export default config;
