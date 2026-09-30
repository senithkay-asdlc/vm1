// The TodoList screen (specs/design/components/todo-webapp/wireframes.dsl):
// navbar "Todo" (shell), heading "My Todos", a row of input + "Add" button,
// and a table "Todo | Status" with a way to mark a pending todo done.
//
// Loads GET /me/todos (gated by src/authz/screens.ts); adds via POST
// /me/todos; completes via POST /me/todos/{todoId}/complete. No local
// business logic — every read and write goes through todoApi.

import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  ListingTable,
  PageContent,
  PageTitle,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { Plus } from "@wso2/oxygen-ui-icons-react";
import { useEffect, useState, type JSX } from "react";
import { todoApi } from "../api";
import type { components } from "../generated/todo-api";
import { Can } from "../authz/gates";

type Todo = components["schemas"]["Todo"];

export function TodoListPage(): JSX.Element {
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTodoText, setNewTodoText] = useState("");
  const [adding, setAdding] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    void loadTodos();
  }, []);

  async function loadTodos(): Promise<void> {
    setError(null);
    const { data, error: fetchError } = await todoApi.GET("/me/todos", {});
    if (fetchError) {
      setError("Could not load your todos. Try reloading the page.");
      return;
    }
    setTodos(data?.data ?? []);
  }

  async function addTodo(): Promise<void> {
    const text = newTodoText.trim();
    if (!text) return;
    setAdding(true);
    setError(null);
    const { data, error: addError } = await todoApi.POST("/me/todos", {
      body: { text },
    });
    setAdding(false);
    if (addError) {
      setError("Could not add that todo. Try again.");
      return;
    }
    if (data) {
      setTodos((current) => [...(current ?? []), data]);
      setNewTodoText("");
    }
  }

  async function completeTodo(todoId: string): Promise<void> {
    setCompletingId(todoId);
    setError(null);
    const { data, error: completeError } = await todoApi.POST(
      "/me/todos/{todoId}/complete",
      { params: { path: { todoId } } },
    );
    setCompletingId(null);
    if (completeError) {
      setError("Could not mark that todo done. Try again.");
      return;
    }
    if (data) {
      setTodos((current) =>
        (current ?? []).map((todo) => (todo.id === todoId ? data : todo)),
      );
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My Todos</PageTitle.Header>
      </PageTitle>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Can op="POST /me/todos">
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <TextField
            label="What needs doing?"
            value={newTodoText}
            onChange={(event) => setNewTodoText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void addTodo();
            }}
            fullWidth
          />
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => void addTodo()}
            disabled={adding || newTodoText.trim().length === 0}
          >
            Add
          </Button>
        </Stack>
      </Can>

      {todos === null ? (
        <Stack direction="row" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <ListingTable.Container disablePaper>
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Todo</ListingTable.Cell>
                <ListingTable.Cell>Status</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {todos.length === 0 ? (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={2}>
                    <ListingTable.EmptyState
                      title="No todos yet"
                      description="Add your first todo above."
                    />
                  </ListingTable.Cell>
                </ListingTable.Row>
              ) : (
                todos.map((todo) => (
                  <ListingTable.Row key={todo.id}>
                    <ListingTable.Cell>{todo.text}</ListingTable.Cell>
                    <ListingTable.Cell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={todo.done ? "Done" : "Pending"}
                          color={todo.done ? "success" : "default"}
                          size="small"
                        />
                        {!todo.done ? (
                          <Can op="POST /me/todos/{todoId}/complete">
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => void completeTodo(todo.id)}
                              disabled={completingId === todo.id}
                            >
                              Mark done
                            </Button>
                          </Can>
                        ) : null}
                      </Stack>
                    </ListingTable.Cell>
                  </ListingTable.Row>
                ))
              )}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
      )}
    </PageContent>
  );
}
