import type { ImageFact } from './extract.js';

export type LinkOutcome = 'ok' | 'broken' | 'temp' | 'uncertain';

export interface LinkHit {
  url: string;
  outcome: Exclude<LinkOutcome, 'ok'>;
}

export interface ResourceSize {
  url: string;
  bytes: number | null;
  type: string | null;
}

export interface CrawlData {
  pages: { url: string; html: string }[];
  truncated: boolean;
  budgetStopped: boolean;
  robotsBlocked: number;
  horsPortee: number;
  internal: LinkHit[];
  external: LinkHit[];
  externalUnchecked: number;
  images: ImageFact[];
  sizes: ResourceSize[];
}

export type QualityFacts =
  | { kind: 'robots' }
  | { kind: 'robots_status'; status: number }
  | { kind: 'robots_down' }
  | { kind: 'status'; status: number }
  | { kind: 'down' }
  | { kind: 'not_html' }
  | { kind: 'left' }
  | { kind: 'budget' }
  | { kind: 'ok'; data: CrawlData };
