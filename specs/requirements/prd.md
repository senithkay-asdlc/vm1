# vm1 — PRD

## Problem Statement

People who just want to jot down a few tasks and check them off are stuck with
to-do apps that bury that simple need under categories, due dates, reminders,
sharing, and other machinery they never asked for. They want a place to note
what needs doing and mark it done when it's done — nothing else — while still
knowing their list is theirs alone and won't disappear between sessions.

## Solution

A minimal, single-purpose to-do app: sign in, add a todo, mark a todo done.
Each signed-in user's list is private to them and persisted in a database, so
it's there the next time they come back. No editing, no deleting, no
categories — just the two actions the idea calls for.

## Actors

- **User** — signs up and signs in, adds todos to their own list, views that
list, and marks todos as done. Every user's list is private to them; there
is no shared or team list and no admin role.

## User Stories

1. As a User, I want to sign up for an account, so that I can start keeping my own list of todos.
2. As a User, I want to sign in, so that I can securely get to my todos.
3. As a User, I want to add a todo, so that I can capture something I need to do.
4. As a User, I want to view my list of todos, so that I can see what's still pending and what I've finished.
5. As a User, I want to mark a todo as done, so that I can track my progress without deleting my history of tasks.

## Product Decisions

- Sign-in is via SSO through Thunder, the platform IDP (org default).
- Self-service sign-up is permitted — anyone can create their own account and start using the app right away.
- Todos are private per user: nobody sees or acts on another user's list.
- Todo data is persisted in a database so it survives across sessions.
- The only actions on a todo are creating it and marking it done — there is no edit and no delete, by explicit product choice.

## Out of Scope

- Editing a todo's text once created.
- Deleting a todo.
- Un-marking a todo (reverting it from done back to pending).
- Due dates, priorities, categories, tags, or reminders.
- Sharing a todo or a list between users, or any team/shared list view.
- Notifications of any kind.

## Open Questions

None — every product-altitude decision the PRD needs is settled above.

## Further Notes

None.

