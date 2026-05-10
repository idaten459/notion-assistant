import { assertCronSecret } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { ensureOperationalSchema } from "@/lib/notion";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const config = getConfig();
  const unauthorized = assertCronSecret(request, config.cronSecret);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await ensureOperationalSchema(config);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
