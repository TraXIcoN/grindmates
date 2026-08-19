/**
 * Dynamic config on top of app.json.
 *
 * The ONLY thing added here is the web base path, and only when WEB_BASE_URL
 * is set (the GitHub Pages workflows set it to /grindmates). It must never be
 * present for native builds: expo's export:embed applies experiments.baseUrl
 * to iOS/Android asset destinations too, which nests every asset under
 * Grindmates.app/grindmates/... and fails the Xcode archive with ENOTDIR.
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.WEB_BASE_URL ? { baseUrl: process.env.WEB_BASE_URL } : {}),
  },
});
