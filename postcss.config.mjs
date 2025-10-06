// Make PostCSS config friendly for both Next dev/build and Vitest.
// In tests, avoid loading Tailwind/PostCSS entirely to prevent Vite from evaluating
// Node-only plugins. In Next, keep the Tailwind v4 PostCSS plugin enabled.
const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');

const config = {
  // Next accepts string plugin identifiers. Vitest rejects strings, so we disable in tests.
  plugins: isTest ? [] : ["@tailwindcss/postcss"],
};

export default config;
