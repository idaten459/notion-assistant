import { assertAppPassword } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { enrichUrl } from "@/lib/enrichment";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const config = getConfig();
  const unauthorized = assertAppPassword(request, config);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url) {
      return Response.json({ error: "url is required" }, { status: 400 });
    }

    const result = await enrichUrl(body.url, config);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 400 }
    );
  }
}
