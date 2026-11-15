import { defineConfig, type ViteUserConfig } from "vite-plus";

// Typed explicitly: tsconfig enables isolatedDeclarations for JSR.
const config: ViteUserConfig = defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    // Prose: formatting it would bury content changes in blame.
    ignorePatterns: ["**/*.md"],
  },
  run: {
    tasks: {
      // Runs every check JSR publish runs, including slow types.
      "jsr:dry-run": { command: "deno publish --dry-run", cache: false },
    },
  },
});

export default config;
