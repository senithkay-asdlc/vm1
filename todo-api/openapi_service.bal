// Generated from specs/design/components/todo-api/openapi.yaml by the
// Ballerina OpenAPI tool, then hand-wired: InterceptableService plus the
// gateway-assertion caller on every resource (gateway_assertion.bal), and a
// real implementation of each resource body over db.bal.

import ballerina/http;
import ballerina/sql;
import ballerina/time;
import ballerina/uuid;

listener http:Listener ep0 = new (9090);

service http:InterceptableService / on ep0 {

    public function createInterceptors() returns AssertionInterceptor => new;

    # The caller's todos
    #
    # + return - returns can be any of following types
    # http:Ok (a page of the caller's todos)
    # http:Unauthorized (not signed in)
    resource function get me/todos(http:RequestContext ctx, int 'limit = 20, int offset = 0)
            returns inline_response_200|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return <ErrorUnauthorized>{body: {code: 401, message: "not signed in"}};
        }

        int pageLimit = 'limit;
        if pageLimit < 1 {
            pageLimit = 20;
        } else if pageLimit > 100 {
            pageLimit = 100;
        }
        int pageOffset = offset < 0 ? 0 : offset;

        int|error total = countTodosForUser(caller.userId);
        if total is error {
            return <http:InternalServerError>{body: {code: 500, message: "failed to load todos"}};
        }
        TodoRow[]|error rows = listTodosForUser(caller.userId, pageLimit, pageOffset);
        if rows is error {
            return <http:InternalServerError>{body: {code: 500, message: "failed to load todos"}};
        }

        Todo[] data = from TodoRow row in rows
            select toTodo(row);

        int nextOffset = pageOffset + pageLimit;
        string? next = nextOffset < total
            ? string `/me/todos?limit=${pageLimit}&offset=${nextOffset}`
            : ();
        int previousOffset = pageOffset - pageLimit;
        string? previous = pageOffset > 0
            ? string `/me/todos?limit=${pageLimit}&offset=${previousOffset < 0 ? 0 : previousOffset}`
            : ();

        return <inline_response_200>{count: total, next: next, previous: previous, data: data};
    }

    # Add a todo to the caller's list
    #
    # + return - returns can be any of following types
    # http:Created (todo created)
    # http:BadRequest (invalid todo)
    # http:Unauthorized (not signed in)
    resource function post me/todos(http:RequestContext ctx, @http:Payload NewTodo payload)
            returns Todo|ErrorBadRequest|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return <ErrorUnauthorized>{body: {code: 401, message: "not signed in"}};
        }

        string text = payload.text.trim();
        if text == "" {
            return <ErrorBadRequest>{body: {code: 400, message: "text must not be empty"}};
        }

        string id = uuid:createRandomUuid();
        time:Utc createdAt = time:utcNow();
        error? inserted = insertTodo(id, caller.userId, text, createdAt);
        if inserted is error {
            return <http:InternalServerError>{body: {code: 500, message: "failed to create todo"}};
        }

        return <Todo>{id: id, text: text, done: false, createdAt: time:utcToString(createdAt)};
    }

    # Mark one of the caller's todos as done
    #
    # + return - returns can be any of following types
    # http:Ok (todo marked done)
    # http:NotFound (no such todo for the caller)
    # http:Unauthorized (not signed in)
    resource function post me/todos/[string todoId]/complete(http:RequestContext ctx)
            returns TodoOk|ErrorNotFound|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return <ErrorUnauthorized>{body: {code: 401, message: "not signed in"}};
        }

        TodoRow|error result = completeTodoForUser(todoId, caller.userId);
        if result is sql:NoRowsError {
            return <ErrorNotFound>{body: {code: 404, message: "no such todo for the caller"}};
        }
        if result is error {
            return <http:InternalServerError>{body: {code: 500, message: "failed to complete todo"}};
        }

        return <TodoOk>{body: toTodo(result)};
    }
}

function toTodo(TodoRow row) returns Todo => {
    id: row.id,
    text: row.text,
    done: row.done,
    createdAt: time:utcToString(row.createdAt)
};

public type TodoOk record {|
    *http:Ok;
    Todo body;
|};

public type Todo record {
    # todo id
    string id;
    # what needs doing
    string text;
    # whether it is finished
    boolean done;
    # when it was added
    string createdAt;
};

public type NewTodo record {
    # what needs doing
    string text;
};

public type ErrorNotFound record {|
    *http:NotFound;
    Error body;
|};

public type inline_response_200 record {
    # total matching items
    int count;
    # relative URI of the next page
    string? next?;
    # relative URI of the previous page
    string? previous?;
    Todo[] data;
};

public type Error record {
    # HTTP or application error code
    int code;
    # short human-readable label
    string message;
    # detailed explanation
    string description?;
    # URI to documentation
    string moreInfo?;
};

public type ErrorBadRequest record {|
    *http:BadRequest;
    Error body;
|};

public type ErrorUnauthorized record {|
    *http:Unauthorized;
    Error body;
|};
