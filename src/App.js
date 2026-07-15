/**
 * Compatibility entry for CRA-style imports and older MusicStudioLab builds.
 *
 * The implementation remains in App.jsx so JSX-aware editors retain syntax
 * support, while `import App from "./App"` and explicit `./App.js` imports work
 * consistently in Vite, Jest, WebStorm, and older project tooling.
 */
export { default } from "./App.jsx";
