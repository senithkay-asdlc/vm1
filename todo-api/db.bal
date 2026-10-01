// Persistence for the Todo entity, in the dedicated todo-db Postgres
// database. Every row is scoped by userId, the gateway-asserted identity.

import ballerina/sql;
import ballerina/time;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

// The client's own init() probes connectivity even with a lazy connection
// pool, so it is stored as a union rather than `check new (...)`: this
// service has no required env var and no guarantee todo-db is reachable the
// instant the process starts, and a boot panic here would take the whole
// listener down over a dependency that is not up yet. Every data function
// below resolves it through readyClient(), which turns "not reachable" into
// an ordinary error a resource maps to 500 instead of a crash.
final postgresql:Client|error todoDbClientResult = new (
    host = todoDbHost,
    username = todoDbUser,
    password = todoDbPassword,
    database = todoDbName,
    port = todoDbPort,
    connectionPool = {connectionTimeout: 5}
);

// A Todo row as it comes back from the database.
type TodoRow record {|
    string id;
    string text;
    boolean done;
    time:Utc createdAt;
|};

// CREATE TABLE IF NOT EXISTS, so calling this from every data function below
// is idempotent and cheap. Deliberately not a module-level `check` — the
// schema only needs to exist before the first query, not before the
// listener binds its port.
function ensureTodoTable(postgresql:Client dbc) returns error? {
    sql:ParameterizedQuery createTable = `
        CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            text TEXT NOT NULL,
            done BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
    _ = check dbc->execute(createTable);
    sql:ParameterizedQuery createIndex = `
        CREATE INDEX IF NOT EXISTS todos_user_id_idx ON todos (user_id)`;
    _ = check dbc->execute(createIndex);
}

// The connected client, with the schema already in place. Every data
// function below goes through this rather than touching todoDbClientResult
// directly.
function readyClient() returns postgresql:Client|error {
    postgresql:Client|error dbc = todoDbClientResult;
    if dbc is error {
        return dbc;
    }
    check ensureTodoTable(dbc);
    return dbc;
}

// Total number of todos owned by userId.
function countTodosForUser(string userId) returns int|error {
    postgresql:Client|error dbc = readyClient();
    if dbc is error {
        return dbc;
    }
    sql:ParameterizedQuery q = `SELECT COUNT(*) FROM todos WHERE user_id = ${userId}`;
    int count = check dbc->queryRow(q);
    return count;
}

// One page of userId's own todos, most recently added first.
function listTodosForUser(string userId, int pageLimit, int pageOffset) returns TodoRow[]|error {
    postgresql:Client|error dbc = readyClient();
    if dbc is error {
        return dbc;
    }
    sql:ParameterizedQuery q = `SELECT id, text, done, created_at AS "createdAt"
        FROM todos
        WHERE user_id = ${userId}
        ORDER BY created_at DESC, id DESC
        LIMIT ${pageLimit} OFFSET ${pageOffset}`;
    stream<TodoRow, sql:Error?> rowStream = dbc->query(q);
    TodoRow[] rows = [];
    check from TodoRow row in rowStream
        do {
            rows.push(row);
        };
    return rows;
}

// Inserts a new todo, owned by userId, done = false.
function insertTodo(string id, string userId, string text, time:Utc createdAt) returns error? {
    postgresql:Client|error dbc = readyClient();
    if dbc is error {
        return dbc;
    }
    sql:ParameterizedQuery q = `INSERT INTO todos (id, user_id, text, done, created_at)
        VALUES (${id}, ${userId}, ${text}, FALSE, ${createdAt})`;
    _ = check dbc->execute(q);
}

// Marks todoId done, only when it belongs to userId. done only ever moves
// false -> true: an already-done row stays done and is returned unchanged.
// sql:NoRowsError when no row matches id + owner, so the caller returns 404
// without it ever having been possible to learn whether the id belongs to
// someone else.
function completeTodoForUser(string todoId, string userId) returns TodoRow|error {
    postgresql:Client|error dbc = readyClient();
    if dbc is error {
        return dbc;
    }
    sql:ParameterizedQuery q = `UPDATE todos
        SET done = TRUE
        WHERE id = ${todoId} AND user_id = ${userId}
        RETURNING id, text, done, created_at AS "createdAt"`;
    TodoRow row = check dbc->queryRow(q);
    return row;
}

// Updates todoId's text, only when it belongs to userId and is still
// pending. The done = FALSE guard locks a todo's text once it is marked
// done, same as the entity description promises. sql:NoRowsError when no
// row matches id + owner + pending, so the caller returns 404 without it
// ever having been possible to learn whether the id belongs to someone
// else or is already done.
function editTodoForUser(string todoId, string userId, string text) returns TodoRow|error {
    postgresql:Client|error dbc = readyClient();
    if dbc is error {
        return dbc;
    }
    sql:ParameterizedQuery q = `UPDATE todos
        SET text = ${text}
        WHERE id = ${todoId} AND user_id = ${userId} AND done = FALSE
        RETURNING id, text, done, created_at AS "createdAt"`;
    TodoRow row = check dbc->queryRow(q);
    return row;
}
