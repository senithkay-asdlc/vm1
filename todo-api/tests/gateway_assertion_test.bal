// Covers the gateway-assertion interceptor (gateway_assertion.bal): a
// caller with no assertion at all is 401, a valid one reaches the handler,
// one signed with the wrong key is 401, and one whose payload was edited
// after signing is 401 — never downgraded to an anonymous caller.
//
// GATEWAY_ASSERTION_CERTIFICATE / _ISSUER / _HEADER must be exported to a
// throwaway RSA keypair's self-signed certificate BEFORE `bal test` runs
// (see tests/resources and the export block the run script sets up) — with
// the trio unset the interceptor takes its unverified fallback and every
// case here fails for a reason the output does not name.
//
// todo-api has no `security: []` operation, so every one of its three
// resources needs the assertion — there is no public-path case to add here.
//
// None of these calls exercise the database: POST /me/todos with an empty
// text is rejected before the handler ever reaches db.bal, which is what
// lets "valid assertion accepted" be asserted deterministically without a
// live todo-db connection.

import ballerina/crypto;
import ballerina/http;
import ballerina/jwt;
import ballerina/lang.array;
import ballerina/test;

const string TEST_ISSUER = "test-gateway-issuer";
const string ASSERTION_HEADER = "x-jwt-assertion";

const string VALID_KEY_FILE = "tests/resources/valid_key.pem";
const string WRONG_KEY_FILE = "tests/resources/wrong_key.pem";

final http:Client gatewayTestClient = check new ("http://localhost:9090");

// Mints an assertion the same shape gateway_assertion.bal expects: `sub`
// (the userId), a `scope` claim and a `username` claim, signed with the
// given private key.
function mintAssertion(string keyFile, string subject) returns string|error {
    crypto:PrivateKey privateKey = check crypto:decodeRsaPrivateKeyFromKeyFile(keyFile);
    jwt:IssuerConfig issuerConfig = {
        issuer: TEST_ISSUER,
        username: subject,
        customClaims: {"scope": "todos:read todos:create todos:complete", "username": subject, "ouHandle": "test-org"},
        expTime: 300,
        signatureConfig: {algorithm: jwt:RS256, config: privateKey}
    };
    return jwt:issue(issuerConfig);
}

// Base64url (no padding) -> the standard base64 array:fromBase64 needs.
function base64UrlDecode(string segment) returns byte[]|error {
    string standard = re `-`.replaceAll(segment, "+");
    standard = re `_`.replaceAll(standard, "/");
    int remainder = standard.length() % 4;
    if remainder == 2 {
        standard = standard + "==";
    } else if remainder == 3 {
        standard = standard + "=";
    }
    return array:fromBase64(standard);
}

// The reverse: standard base64 -> base64url, padding stripped.
function base64UrlEncode(byte[] data) returns string {
    string standard = data.toBase64();
    string url = re `\+`.replaceAll(standard, "-");
    url = re `/`.replaceAll(url, "_");
    return re `=+$`.replace(url, "");
}

// Re-encodes a validly-signed assertion with its payload's `sub` changed,
// keeping the ORIGINAL signature — the shape of an attacker editing a
// captured token rather than forging a fresh one.
function tamperPayloadSub(string token) returns string|error {
    string[] parts = re `\.`.split(token);
    if parts.length() != 3 {
        return error("not a three-part JWT");
    }
    byte[] payloadBytes = check base64UrlDecode(parts[1]);
    string payloadText = check string:fromBytes(payloadBytes);
    json payloadJson = check payloadText.fromJsonString();
    map<json> payloadMap = check payloadJson.ensureType();
    payloadMap["sub"] = "tampered-user-id";
    string tamperedPayload = base64UrlEncode(payloadMap.toJsonString().toBytes());
    return parts[0] + "." + tamperedPayload + "." + parts[2];
}

@test:Config {}
function testNoAssertionIsUnauthorized() returns error? {
    http:Response res = check gatewayTestClient->post("/me/todos", {text: "buy milk"});
    test:assertEquals(res.statusCode, 401);
}

@test:Config {}
function testValidAssertionReachesTheHandler() returns error? {
    string token = check mintAssertion(VALID_KEY_FILE, "11111111-1111-1111-1111-111111111111");
    http:Response res = check gatewayTestClient->post("/me/todos", {text: ""}, headers = {[ASSERTION_HEADER]: token});
    // The interceptor accepted the caller — otherwise this would be 401.
    // Business validation (empty text) is what answers next, before the
    // handler ever reaches the database.
    test:assertEquals(res.statusCode, 400);
}

@test:Config {}
function testWrongKeySignatureIsUnauthorized() returns error? {
    string token = check mintAssertion(WRONG_KEY_FILE, "22222222-2222-2222-2222-222222222222");
    http:Response res = check gatewayTestClient->post("/me/todos", {text: "buy milk"}, headers = {[ASSERTION_HEADER]: token});
    test:assertEquals(res.statusCode, 401);
}

@test:Config {}
function testTamperedPayloadIsUnauthorized() returns error? {
    string validToken = check mintAssertion(VALID_KEY_FILE, "33333333-3333-3333-3333-333333333333");
    string tampered = check tamperPayloadSub(validToken);
    http:Response res = check gatewayTestClient->post("/me/todos", {text: "buy milk"}, headers = {[ASSERTION_HEADER]: tampered});
    test:assertEquals(res.statusCode, 401);
}
