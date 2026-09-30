// The typed client against todo-api's contract, generated into
// src/generated/todo-api.ts. Same-origin `/api`: nginx in this pod
// reverse-proxies to the sibling through the API gateway (react-webapp).
//
// Authorization is entirely src/authz/client.ts's: this file attaches no
// bearer of its own and never reads a response status to decide about
// sign-in. See that module for why: the gateway answers 401 for every
// refusal — a missing scope indistinguishable from a dead token — so the
// decision has to come from the SPA's own `expires_at`, not from this
// middleware.

import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/todo-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

export const todoApi = createClient<paths>({ baseUrl: "/api" });
todoApi.use(authMiddleware);
