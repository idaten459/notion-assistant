import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  isDataSourceEventForConfiguredSource,
  isPageEventForConfiguredDataSource,
  pageIdsFromDataSourceEvent,
  verifyNotionWebhookSignature
} from "./webhook";

describe("webhook helpers", () => {
  it("verifies Notion signatures", () => {
    const body = JSON.stringify({ type: "page.properties_updated" });
    const token = "secret_test";
    const signature = `sha256=${createHmac("sha256", token).update(body).digest("hex")}`;

    expect(verifyNotionWebhookSignature(body, signature, token)).toBe(true);
    expect(verifyNotionWebhookSignature(body, "sha256=bad", token)).toBe(false);
  });

  it("accepts page events from the configured data source", () => {
    expect(
      isPageEventForConfiguredDataSource(
        {
          type: "page.properties_updated",
          entity: { type: "page", id: "page-id" },
          data: { parent: { data_source_id: "source-id" } }
        },
        "source-id"
      )
    ).toBe(true);
  });

  it("extracts updated page ids from data source events", () => {
    expect(
      pageIdsFromDataSourceEvent({
        type: "data_source.content_updated",
        entity: { type: "data_source", id: "source-id" },
        data: {
          parent: { data_source_id: "source-id" },
          updated_blocks: [
            { type: "page", id: "page-1" },
            { type: "page", id: "page-1" },
            { type: "block", id: "block-1" },
            { type: "page", id: "page-2" }
          ]
        }
      })
    ).toEqual(["page-1", "page-2"]);
  });

  it("matches data source events by parent data source id", () => {
    expect(
      isDataSourceEventForConfiguredSource(
        {
          type: "data_source.content_updated",
          entity: { type: "data_source", id: "source-id" },
          data: { parent: { data_source_id: "source-id" } }
        },
        "source-id"
      )
    ).toBe(true);
  });
});
