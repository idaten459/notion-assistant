import { enrichUrl } from "./enrichment";
import {
  buildCreateProperties,
  buildFailureProperties,
  buildUpdateProperties,
  isPageAlreadyHandled,
  operationalPropertyDefinitions,
  readPageUrl,
  requiredPropertyNames,
  type NotionPageProperties
} from "./notionProperties";
import { requireConfigValue } from "./config";
import type {
  EnrichmentCandidate,
  NotionDataSource,
  RestaurantPageInput,
  RuntimeConfig
} from "./types";

const NOTION_VERSION = "2025-09-03";

interface NotionPage {
  id: string;
  object: "page";
  properties: NotionPageProperties;
}

interface QueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor?: string;
}

export async function retrieveDataSource(config: RuntimeConfig): Promise<NotionDataSource> {
  const dataSourceId = requireConfigValue(config.notionDataSourceId, "NOTION_DATA_SOURCE_ID");
  return notionRequest<NotionDataSource>(config, `/v1/data_sources/${dataSourceId}`, {
    method: "GET"
  });
}

export async function createRestaurantPage(
  config: RuntimeConfig,
  input: RestaurantPageInput
): Promise<NotionPage> {
  const dataSource = await retrieveDataSource(config);
  const dataSourceId = requireConfigValue(config.notionDataSourceId, "NOTION_DATA_SOURCE_ID");
  const properties = buildCreateProperties(dataSource.properties, {
    url: input.inputUrl,
    candidate: input.candidate,
    status: input.status,
    review: input.review,
    autoWriteThreshold: config.autoWriteThreshold
  });

  return notionRequest<NotionPage>(config, "/v1/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: {
        type: "data_source_id",
        data_source_id: dataSourceId
      },
      properties
    })
  });
}

export async function syncPageById(config: RuntimeConfig, pageId: string): Promise<{
  pageId: string;
  skipped?: string;
  candidate?: EnrichmentCandidate;
  warnings?: string[];
}> {
  const page = await retrievePage(config, pageId);
  if (isPageAlreadyHandled(page.properties)) {
    return { pageId, skipped: "already_handled" };
  }

  const url = readPageUrl(page.properties);
  if (!url) {
    return { pageId, skipped: "missing_url" };
  }

  try {
    const enrichment = await enrichUrl(url, config);
    const candidate = enrichment.selectedCandidate;

    if (!candidate) {
      await markPageFailure(config, pageId, "候補を取得できませんでした。");
      return { pageId, skipped: "no_candidate", warnings: enrichment.warnings };
    }

    const dataSource = await retrieveDataSource(config);
    const properties = buildUpdateProperties(dataSource.properties, page.properties, {
      url,
      candidate,
      autoWriteThreshold: config.autoWriteThreshold
    });

    await updatePage(config, pageId, properties);
    return { pageId, candidate, warnings: enrichment.warnings };
  } catch (error) {
    await markPageFailure(config, pageId, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function syncUnenrichedPages(
  config: RuntimeConfig,
  limit = 20
): Promise<{
  processed: number;
  updated: number;
  skipped: number;
  failures: Array<{ pageId: string; error: string }>;
}> {
  const pages = await queryRecentPages(config, limit);
  let updated = 0;
  let skipped = 0;
  const failures: Array<{ pageId: string; error: string }> = [];

  for (const page of pages) {
    const url = readPageUrl(page.properties);
    if (!url || isPageAlreadyHandled(page.properties)) {
      skipped += 1;
      continue;
    }

    try {
      const result = await syncPageById(config, page.id);
      if (result.candidate) {
        updated += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failures.push({
        pageId: page.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    processed: pages.length,
    updated,
    skipped,
    failures
  };
}

export async function ensureOperationalSchema(config: RuntimeConfig): Promise<{
  added: string[];
  missingRequired: string[];
}> {
  const dataSource = await retrieveDataSource(config);
  const existingNames = new Set(Object.keys(dataSource.properties));
  const definitions = operationalPropertyDefinitions();
  const missingOperational = Object.entries(definitions).filter(([name]) => !existingNames.has(name));
  const missingRequired = requiredPropertyNames().filter((name) => !existingNames.has(name));

  if (missingOperational.length > 0) {
    await notionRequest(config, `/v1/data_sources/${dataSource.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        properties: Object.fromEntries(missingOperational)
      })
    });
  }

  return {
    added: missingOperational.map(([name]) => name),
    missingRequired
  };
}

async function retrievePage(config: RuntimeConfig, pageId: string): Promise<NotionPage> {
  return notionRequest<NotionPage>(config, `/v1/pages/${pageId}`, {
    method: "GET"
  });
}

async function updatePage(
  config: RuntimeConfig,
  pageId: string,
  properties: Record<string, unknown>
): Promise<NotionPage> {
  return notionRequest<NotionPage>(config, `/v1/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties })
  });
}

async function markPageFailure(config: RuntimeConfig, pageId: string, message: string): Promise<void> {
  const dataSource = await retrieveDataSource(config);
  const properties = buildFailureProperties(dataSource.properties, message);
  if (Object.keys(properties).length > 0) {
    await updatePage(config, pageId, properties);
  }
}

async function queryRecentPages(config: RuntimeConfig, limit: number): Promise<NotionPage[]> {
  const dataSourceId = requireConfigValue(config.notionDataSourceId, "NOTION_DATA_SOURCE_ID");
  const pages: NotionPage[] = [];
  let startCursor: string | undefined;

  while (pages.length < limit) {
    const body: Record<string, unknown> = {
      page_size: Math.min(100, limit - pages.length),
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }]
    };

    if (startCursor) {
      body.start_cursor = startCursor;
    }

    const result = await notionRequest<QueryResponse>(config, `/v1/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body: JSON.stringify(body)
    });

    pages.push(...result.results);
    if (!result.has_more || !result.next_cursor) {
      break;
    }
    startCursor = result.next_cursor;
  }

  return pages;
}

async function notionRequest<T>(
  config: RuntimeConfig,
  path: string,
  init: RequestInit
): Promise<T> {
  const token = requireConfigValue(config.notionToken, "NOTION_TOKEN");
  const response = await fetch(`https://api.notion.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "notion-version": NOTION_VERSION,
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API ${path} failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}
