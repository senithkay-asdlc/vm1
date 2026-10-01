// The EditTodo screen (specs/design/components/todo-webapp/wireframes.dsl):
// navbar "Todo" (shell), heading "Edit Todo", an input prefilled with the
// pending todo's current text, and a row of "Cancel" / "Save" buttons.
// Reached from TodoList's table "Edit" action on a pending row.
//
// This screen has no load call of its own — src/authz/screens.ts names its
// PATCH as the operation it gates on. It edits the text of one of the
// caller's PENDING todos via PATCH /me/todos/{todoId} (scope todos:edit).
//
// Design choice: TodoList already has the todo's current text in hand when
// the user clicks "Edit", so it passes it via router state (`{ text }`)
// rather than making this screen re-fetch the whole list. That avoids a
// redundant GET /me/todos on every edit. A direct visit to this URL (a
// reload, a typed link) carries no state, so this screen falls back to
// GET /me/todos and finds the matching row itself — todo-api has no
// single-todo GET, so the list call is the only way to recover the text in
// that case. Either path ends with the same `text`/`notFound` state.

import {
  Alert,
  Button,
  CircularProgress,
  PageContent,
  PageTitle,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { useEffect, useState, type JSX } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { todoApi } from "../api";

interface LocationState {
  text?: string;
}

export function EditTodoPage(): JSX.Element {
  const { todoId } = useParams<{ todoId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const initialText = (location.state as LocationState | null)?.text;

  const [text, setText] = useState(initialText ?? "");
  const [loading, setLoading] = useState(initialText === undefined);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialText !== undefined) return; // already have it from TodoList's navigate state
    void loadCurrentText();
    // Only ever needs to run once, for the fallback (direct-URL) path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCurrentText(): Promise<void> {
    if (!todoId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await todoApi.GET("/me/todos", {});
    setLoading(false);
    if (fetchError) {
      setError("Could not load this todo. Try reloading the page.");
      return;
    }
    const todo = (data?.data ?? []).find((t) => t.id === todoId);
    if (!todo || todo.done) {
      setNotFound(true);
      return;
    }
    setText(todo.text);
  }

  async function save(): Promise<void> {
    if (!todoId) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    const { error: saveError, response } = await todoApi.PATCH(
      "/me/todos/{todoId}",
      { params: { path: { todoId } }, body: { text: trimmed } },
    );
    setSaving(false);
    if (saveError) {
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      setError("Could not save that change. Try again.");
      return;
    }
    navigate("/todos");
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Edit Todo</PageTitle.Header>
      </PageTitle>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Stack direction="row" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : notFound ? (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Alert severity="warning">
            This todo is no longer pending, or it no longer exists.
          </Alert>
          <Stack direction="row" justifyContent="flex-end">
            <Button variant="contained" onClick={() => navigate("/todos")}>
              Back to My Todos
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label="Todo text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            fullWidth
            autoFocus
          />
          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button variant="outlined" onClick={() => navigate("/todos")}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void save()}
              disabled={saving || text.trim().length === 0}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      )}
    </PageContent>
  );
}
