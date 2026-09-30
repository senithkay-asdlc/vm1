// The one registered redirect URI, serving BOTH the redirect leg and the
// silent-renew leg (thunder-authentication). Calls signinCallback() via
// handleCallback(), never signinRedirectCallback(), and renders from the
// promise SETTLING, not from a value.

import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { handleCallback } from "../authz/session";
import { APP_NAME } from "../appName";

export function CallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void handleCallback()
      .then(() => {
        if (live) navigate("/", { replace: true });
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [navigate]);

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>{failed ? "Sign-in did not complete. Try again." : "Signing you in…"}</p>
    </main>
  );
}
