import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Same network settings for the dev server (`npm run dev`) and the fast demo build (`npm run demo`)
const network = {
  host: true, // also reachable from phones on the same Wi-Fi
  // Allow public tunnel addresses, so phones on ANY network can open the QR tracking page
  // (e.g. `cloudflared tunnel --url http://localhost:5173` gives https://xxxx.trycloudflare.com)
  allowedHosts: [".trycloudflare.com"],
  proxy: {
    "/api": "http://localhost:5000", // forward API calls to the Express server
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, ...network },
  // `npm run demo` serves the optimised build on the SAME port, so the tunnel command stays the same
  preview: { port: 5173, strictPort: true, ...network },
});
