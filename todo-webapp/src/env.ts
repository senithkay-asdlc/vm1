// Typed read of window._env_, mounted by the platform's /env-config.js at
// request time — never build time. See react-webapp's Constraints: no
// import.meta.env.VITE_*, no process.env, no .env file.

type Env = {
  // This SPA's auth platform-resource dependency, named `user-auth` in
  // design.json. All four are required — RESOURCE is not optional: without
  // it the token's `aud` is wrong and every /api call 401s while sign-in
  // itself looks healthy. The dependency also emits USER_AUTH_JWKS_URL; it
  // is deliberately NOT declared here — the browser never validates a
  // token, the API gateway does, so no asset reads it.
  USER_AUTH_CLIENT_ID: string;
  USER_AUTH_ISSUER: string;
  USER_AUTH_SCOPES: string;
  USER_AUTH_RESOURCE: string;
};

declare global {
  interface Window {
    _env_: Env;
  }
}

if (!window._env_) {
  throw new Error(
    "window._env_ not set — /env-config.js failed to load. " +
      "The platform mounts this file; if you see this locally, host " +
      "/env-config.js from your dev server.",
  );
}

export const env: Env = window._env_;
