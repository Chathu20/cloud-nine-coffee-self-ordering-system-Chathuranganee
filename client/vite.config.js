import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // also reachable from phones on the same Wi-Fi
    // Allow public tunnel addresses, so phones on ANY network can open the QR tracking page
    // (e.g. `cloudflared tunnel --url http://localhost:5173` gives https://xxxx.trycloudflare.com)
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": "http://localhost:5000", // forward API calls to the Express server
    },
  },
});