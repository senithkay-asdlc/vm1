// mock/env.ts — YOURS. Carries exactly the keys the platform actually emits
// for this component (the key table in react-webapp's SKILL.md Constraints):
// this app's own USER_AUTH_* OIDC keys. No USER_AUTH_JWKS_URL — the browser
// never validates a token, so src/env.ts does not declare it and mock mode
// does not carry it either. No sibling API URL — that is same-origin /api,
// never a browser key.

export const mockEnv = {
  USER_AUTH_CLIENT_ID: "mock-client",
  USER_AUTH_ISSUER: "https://mock-idp.test",
  USER_AUTH_SCOPES: "openid profile email group ou todos:read todos:create todos:complete",
  USER_AUTH_RESOURCE: "https://mock-idp.test/resources/mock-project",
};
