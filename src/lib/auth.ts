import type { RuntimeConfig } from "./types";

export function assertAppPassword(request: Request, config: RuntimeConfig): Response | null {
  if (!config.appPassword) {
    return null;
  }

  const provided = request.headers.get("x-app-password") || "";
  if (provided === config.appPassword) {
    return null;
  }

  return Response.json(
    {
      error: "APP_PASSWORD is required",
      code: "unauthorized"
    },
    { status: 401 }
  );
}

export function assertCronSecret(request: Request, secret: string | undefined): Response | null {
  if (!secret) {
    return Response.json(
      {
        error: "CRON_SECRET is not configured",
        code: "missing_cron_secret"
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");
  const token =
    authorization?.startsWith("Bearer ") === true
      ? authorization.slice("Bearer ".length)
      : url.searchParams.get("secret");

  if (token === secret) {
    return null;
  }

  return Response.json(
    {
      error: "Invalid cron secret",
      code: "unauthorized"
    },
    { status: 401 }
  );
}
