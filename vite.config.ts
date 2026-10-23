import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) =>
          id.includes("@dimforge") || id.includes("@react-three/rapier")
            ? "physics"
            : id.includes("/three/")
              ? "three"
              : undefined,
      },
    },
  },
});
