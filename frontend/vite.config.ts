import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const backend = "http://localhost:4000";

// Proxying keeps the browser on one origin, so the httpOnly auth cookie "just works" in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": backend, "/auth": backend, "/admin": backend },
  },
});
