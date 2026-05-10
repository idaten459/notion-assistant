import { getConfig } from "@/lib/config";
import { syncPageById, syncUnenrichedPages } from "@/lib/notion";
import {
  isDataSourceEventForConfiguredSource,
  isPageEventForConfiguredDataSource,
  pageIdsFromDataSourceEvent,
  parseWebhookBody,
  verifyNotionWebhookSignature
} from "@/lib/webhook";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const config = getConfig();
  const body = await request.text();
  const event = parseWebhookBody(body);

  if (event.verification_token) {
    console.info(`[notion-webhook] verification_token=${event.verification_token}`);
    return Response.json({
      ok: true,
      verificationToken: event.verification_token,
      nextStep: "Set this value as NOTION_WEBHOOK_VERIFICATION_TOKEN, then verify the subscription in Notion."
    });
  }

  const trusted = verifyNotionWebhookSignature(
    body,
    request.headers.get("x-notion-signature"),
    config.notionWebhookVerificationToken
  );

  if (!trusted) {
    return Response.json({ error: "Invalid Notion webhook signature" }, { status: 401 });
  }

  try {
    if (isPageEventForConfiguredDataSource(event, config.notionDataSourceId) && event.entity?.id) {
      const result = await syncPageById(config, event.entity.id);
      return Response.json({ eventType: event.type, ...result });
    }

    if (isDataSourceEventForConfiguredSource(event, config.notionDataSourceId)) {
      const pageIds = pageIdsFromDataSourceEvent(event).slice(0, 10);
      if (pageIds.length > 0) {
        const results = [];
        for (const pageId of pageIds) {
          results.push(await syncPageById(config, pageId));
        }
        return Response.json({ eventType: event.type, processed: results.length, results });
      }

      const result = await syncUnenrichedPages(config, 10);
      return Response.json({ eventType: event.type, ...result });
    }

    return Response.json({ skipped: "unsupported_event", type: event.type });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    endpoint: "/api/notion/webhook",
    requiredEvents: ["page.created", "page.properties_updated", "data_source.content_updated"],
    note: "Notion must call this endpoint from a public HTTPS URL. localhost is not reachable from Notion."
  });
}
