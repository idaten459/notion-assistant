import { createHmac, timingSafeEqual } from "crypto";

export interface NotionWebhookEvent {
  id?: string;
  type?: string;
  api_version?: string;
  entity?: {
    id?: string;
    type?: string;
  };
  data?: {
    parent?: {
      id?: string;
      type?: string;
      data_source_id?: string;
    };
    updated_properties?: string[];
    updated_blocks?: Array<{
      id?: string;
      type?: string;
    }>;
  };
  verification_token?: string;
}

export function parseWebhookBody(body: string): NotionWebhookEvent {
  return JSON.parse(body) as NotionWebhookEvent;
}

export function verifyNotionWebhookSignature(
  body: string,
  signature: string | null,
  verificationToken: string | undefined
): boolean {
  if (!verificationToken || !signature) {
    return false;
  }

  const calculated = `sha256=${createHmac("sha256", verificationToken).update(body).digest("hex")}`;
  const signatureBuffer = Buffer.from(signature);
  const calculatedBuffer = Buffer.from(calculated);

  if (signatureBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, calculatedBuffer);
}

export function isDataSourceEventForConfiguredSource(
  event: NotionWebhookEvent,
  dataSourceId: string | undefined
): boolean {
  if (!dataSourceId) {
    return false;
  }

  return event.data?.parent?.data_source_id === dataSourceId || event.data?.parent?.id === dataSourceId;
}

export function isPageEventForConfiguredDataSource(
  event: NotionWebhookEvent,
  dataSourceId: string | undefined
): boolean {
  if (event.entity?.type !== "page" || !event.entity.id) {
    return false;
  }

  const parentDataSourceId = event.data?.parent?.data_source_id || event.data?.parent?.id;
  return !parentDataSourceId || parentDataSourceId === dataSourceId;
}

export function pageIdsFromDataSourceEvent(event: NotionWebhookEvent): string[] {
  const pageIds = new Set<string>();

  for (const block of event.data?.updated_blocks || []) {
    if (block.type === "page" && block.id) {
      pageIds.add(block.id);
    }
  }

  return [...pageIds];
}
