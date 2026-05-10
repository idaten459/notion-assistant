import { assertAppPassword } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { createRestaurantPage } from "@/lib/notion";
import type { RestaurantPageInput } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const config = getConfig();
  const unauthorized = assertAppPassword(request, config);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await request.json()) as RestaurantPageInput;
    if (!body.inputUrl || !body.candidate) {
      return Response.json({ error: "inputUrl and candidate are required" }, { status: 400 });
    }

    const page = await createRestaurantPage(config, body);
    return Response.json({ pageId: page.id });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
