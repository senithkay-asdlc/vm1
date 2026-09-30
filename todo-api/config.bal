// Configuration for todo-api. Every value has a default an env var can
// override, so the service starts with no required environment variables.

import ballerina/os;

function envOr(string name, string fallback) returns string {
    string value = os:getEnv(name);
    return value == "" ? fallback : value;
}

function envOrInt(string name, int fallback) returns int {
    string value = os:getEnv(name);
    if value == "" {
        return fallback;
    }
    int|error parsed = int:fromString(value);
    if parsed is int {
        return parsed;
    }
    return fallback;
}

// todo-db (platform-resource: postgres-cnpg)
configurable string todoDbHost = envOr("TODO_DB_HOST", "localhost");
configurable int todoDbPort = envOrInt("TODO_DB_PORT", 5432);
configurable string todoDbUser = envOr("TODO_DB_USER", "postgres");
configurable string todoDbPassword = envOr("TODO_DB_PASSWORD", "postgres");
configurable string todoDbName = envOr("TODO_DB_DBNAME", "todo_api");
