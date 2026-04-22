import type { BrowserAdapter } from "../adapter";
import type { NetworkLogEntry, FormInfo } from "../domain/types";

export interface PluginContext {
  appId: number;
  runId: number;
  baseUrl: string;
  pages: { id: number; url: string }[];
  pageStates: {
    id: number;
    pageId: number;
    html: string;
    text: string;
    url: string;
    headers: Record<string, string>;
  }[];
  networkLogs: NetworkLogEntry[];
  forms: FormInfo[];
  openai?: unknown;
  browser: BrowserAdapter;
}

export interface PluginIssue {
  type: string;
  severity: "error" | "warning" | "info";
  description: string;
  pageUrl: string;
  pageId?: number;
  pageStateId?: number;
  details?: Record<string, unknown>;
}

export interface PluginResult {
  issues: PluginIssue[];
  metadata?: Record<string, unknown>;
}

export interface Plugin {
  name: string;
  description: string;
  analyze(context: PluginContext): Promise<PluginResult>;
}
