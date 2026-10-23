import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// `vite build --mode artifact` produces one self-contained bundle for hosting as a sandboxed artifact.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@engine": fileURLToPath(new URL("./supabase/functions/_shared/engine", import.meta.url)),
      "@shared": fileURLToPath(new URL("./supabase/functions/_shared", import.meta.url)),
    },
  },
  define: mode === "artifact" ? { "import.meta.env.VITE_ARTIFACT": JSON.stringify("1"), "import.meta.env.VITE_SUPABASE_URL": "undefined", "import.meta.env.VITE_SUPABASE_ANON_KEY": "undefined" } : {},
  build: mode === "artifact"
    ? { outDir: "dist-artifact", cssCodeSplit: false, assetsInlineLimit: 100_000_000, rollupOptions: { output: { inlineDynamicImports: true } } }
    : {},
  test: { include: ["tests/**/*.test.ts"] },
}));
