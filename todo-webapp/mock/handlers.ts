// mock/handlers.ts — YOURS. One handler per operation in todo-api's
// openapi.yaml, the same contract src/generated/todo-api.ts came from.
// Seed data matches wireframes.dsl's demo rows (wireframes' scripts/seed.mjs):
// "Buy milk | Pending" and "Write report | Done".
//
// Write NO scope check here — mock/authz/gateway.ts already refused a caller
// who lacks todos:read/todos:create/todos:complete before a request reaches
// this module. What a handler owes is its path's reach: /me/todos is the
// caller's own rows and nothing else, resolved from the mock identity, never
// a query parameter.

import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/todo-api";

type Todo = components["schemas"]["Todo"];

// The caller this mock speaks for. Seed one row owned by somebody else too,
// or /me/ and every-row would look identical — todo-api has no every-row
// operation, but the shape still guards against a handler that forgets to
// filter.
export const mockCaller = { userId: "mock-owner" };

interface StoredTodo extends Todo {
  owner: string;
}

// Module-scope state: a create shows up in the next list, a complete
// persists — but only across in-app navigation. A full page load (reload, a
// typed URL) re-runs this module and resets the seed, because setupWorker
// resolves every request in the page's own JS context. That reset is what
// makes a verification run repeatable.
let todos: StoredTodo[] = [
  {
    id: "1",
    text: "Buy milk",
    done: false,
    createdAt: "2026-09-29T09:00:00.000Z",
    owner: mockCaller.userId,
  },
  {
    id: "2",
    text: "Write report",
    done: true,
    createdAt: "2026-09-28T09:00:00.000Z",
    owner: mockCaller.userId,
  },
  {
    id: "3",
    text: "Someone else's todo",
    done: false,
    createdAt: "2026-09-27T09:00:00.000Z",
    owner: "not-the-caller",
  },
];
let nextId = 4;

function asTodo(stored: StoredTodo): Todo {
  const { owner: _owner, ...todo } = stored;
  return todo;
}

export const handlers = [
  http.get("/api/me/todos", () => {
    const mine = todos.filter((t) => t.owner === mockCaller.userId).map(asTodo);
    return HttpResponse.json({ count: mine.length, next: null, previous: null, data: mine });
  }),

  http.post("/api/me/todos", async ({ request }) => {
    const input = (await request.json()) as { text?: string };
    if (!input?.text || input.text.trim().length === 0) {
      return HttpResponse.json(
        { code: 400, message: "text is required" },
        { status: 400 },
      );
    }
    const created: StoredTodo = {
      id: String(nextId++),
      text: input.text,
      done: false,
      createdAt: new Date().toISOString(),
      owner: mockCaller.userId,
    };
    todos = [...todos, created];
    return HttpResponse.json(asTodo(created), { status: 201 });
  }),

  http.patch("/api/me/todos/:todoId", async ({ params, request }) => {
    const todoId = params.todoId as string;
    const input = (await request.json()) as { text?: string };
    if (!input?.text || input.text.trim().length === 0) {
      return HttpResponse.json(
        { code: 400, message: "text is required" },
        { status: 400 },
      );
    }
    const index = todos.findIndex((t) => t.id === todoId && t.owner === mockCaller.userId);
    // A row that exists but is not the caller's is a 404, not a 403 — under
    // /me/ it is simply not in the caller's collection. Already-done is the
    // same answer: the contract only edits a PENDING todo.
    if (index === -1 || todos[index].done) {
      return HttpResponse.json(
        { code: 404, message: "no such pending todo for the caller" },
        { status: 404 },
      );
    }
    todos[index] = { ...todos[index], text: input.text };
    return HttpResponse.json(asTodo(todos[index]));
  }),

  http.post("/api/me/todos/:todoId/complete", ({ params }) => {
    const todoId = params.todoId as string;
    const index = todos.findIndex((t) => t.id === todoId && t.owner === mockCaller.userId);
    // A row that exists but is not the caller's is a 404, not a 403 — under
    // /me/ it is simply not in the caller's collection.
    if (index === -1) {
      return HttpResponse.json(
        { code: 404, message: "no such todo for the caller" },
        { status: 404 },
      );
    }
    todos[index] = { ...todos[index], done: true };
    return HttpResponse.json(asTodo(todos[index]));
  }),
];
