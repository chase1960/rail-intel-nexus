// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// The MCP vite plugin compares a normalized project root ("C:/…") against a
// path.resolve()-built routesDir ("C:\…"), which throws on Windows. The plugin is
// only needed for the deployed (Linux) runtime, so we skip it locally on win32.
// Set MCP_PLUGIN_FORCE=1 to force-enable it anywhere.
const isWindows = process.platform === "win32";
const enableMcpPlugin = !isWindows || process.env.MCP_PLUGIN_FORCE === "1";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: enableMcpPlugin ? [mcpPlugin()] : [],
  },
});
