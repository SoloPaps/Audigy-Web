import type { CheckResult } from '../../src/types.js';
import type { ImageFact } from './extract.js';
import type {
  CrawlData,
  LinkHit,
  QualityFacts,
  ResourceSize,
} from './facts.js';
import { htmlErrors } from './html-rules.js';
import { IMAGE_MAX_BYTES } from './limits.js';
import { finding } from './result.js';

const SAMPLE = 5;

export function judgeLinks(facts: QualityFacts): CheckResult {
  const gated = gate('qualite.liens', facts);
  if (gated) return gated;
  if (facts.kind !== 'ok') return gate('qualite.liens', facts) as CheckResult;
  const data = facts.data;
  const internal = data.internal.filter((hit) => hit.outcome === 'broken');
  const externalBroken = data.external.filter(
    (hit) => hit.outcome === 'broken',
  );
  const temporary = data.external.filter((hit) => hit.outcome === 'temp');
  const uncertain = data.external.filter((hit) => hit.outcome === 'uncertain');
  const measured = {
    ...baseMeasured(data),
    internalBroken: internal.length,
    externalBroken: externalBroken.length,
    externalTemporary: temporary.length,
    externalUncertain: uncertain.length,
    externalUnchecked: data.externalUnchecked,
    robotsBlocked: data.robotsBlocked,
    horsPortee: data.horsPortee,
    samples: samples(internal, externalBroken, temporary, uncertain),
  };
  if (internal.length === 1) {
    return finding(
      'qualite.liens',
      'fail',
      3,
      3,
      'qualite.liens.fail_internal_one',
      { measured },
    );
  }
  if (internal.length > 1) {
    return finding(
      'qualite.liens',
      'fail',
      3,
      3,
      'qualite.liens.fail_internal_many',
      { params: { count: internal.length }, measured },
    );
  }
  if (externalBroken.length === 1) {
    return finding(
      'qualite.liens',
      'fail',
      2,
      2,
      'qualite.liens.fail_external_one',
      { measured },
    );
  }
  if (externalBroken.length > 1) {
    return finding(
      'qualite.liens',
      'fail',
      2,
      2,
      'qualite.liens.fail_external_many',
      { params: { count: externalBroken.length }, measured },
    );
  }
  if (temporary.length === 1) {
    return finding(
      'qualite.liens',
      'warn',
      2,
      2,
      'qualite.liens.warn_temp_one',
      { measured },
    );
  }
  if (temporary.length > 1) {
    return finding(
      'qualite.liens',
      'warn',
      2,
      2,
      'qualite.liens.warn_temp_many',
      { params: { count: temporary.length }, measured },
    );
  }
  if (uncertain.length === 1) {
    return finding(
      'qualite.liens',
      'warn',
      2,
      1,
      'qualite.liens.warn_uncertain_one',
      { measured },
    );
  }
  if (uncertain.length > 1) {
    return finding(
      'qualite.liens',
      'warn',
      2,
      1,
      'qualite.liens.warn_uncertain_many',
      { params: { count: uncertain.length }, measured },
    );
  }
  return finding('qualite.liens', 'pass', 1, 1, 'qualite.liens.pass', {
    measured,
  });
}

export function judgeHtml(facts: QualityFacts): CheckResult {
  const gated = gate('qualite.html', facts);
  if (gated) return gated;
  if (facts.kind !== 'ok') return gate('qualite.html', facts) as CheckResult;
  const invalid: string[] = [];
  const rules = new Set<string>();
  for (const page of facts.data.pages) {
    const found = htmlErrors(page.html);
    if (found.length === 0) continue;
    invalid.push(page.url);
    for (const rule of found) rules.add(rule);
  }
  const measured = {
    ...baseMeasured(facts.data),
    invalid: invalid.length,
    rules: [...rules].sort(),
  };
  if (invalid.length === 1) {
    return finding('qualite.html', 'fail', 2, 2, 'qualite.html.fail_one', {
      measured,
    });
  }
  if (invalid.length > 1) {
    return finding('qualite.html', 'fail', 2, 2, 'qualite.html.fail_many', {
      params: { count: invalid.length },
      measured,
    });
  }
  return finding('qualite.html', 'pass', 1, 1, 'qualite.html.pass', {
    measured,
  });
}

export function judgeImageWeight(facts: QualityFacts): CheckResult {
  const gated = gate('qualite.images_poids', facts);
  if (gated) return gated;
  if (facts.kind !== 'ok')
    return gate('qualite.images_poids', facts) as CheckResult;
  const images = facts.data.images;
  if (images.length === 0) {
    return finding(
      'qualite.images_poids',
      'na',
      1,
      1,
      'qualite.images_poids.na',
      { measured: baseMeasured(facts.data) },
    );
  }
  const sizes = sizeMap(facts.data.sizes);
  let heavy = 0;
  let unknown = 0;
  let unprobed = 0;
  for (const image of images) {
    const state = weightOf(image, sizes);
    if (state === 'heavy') heavy += 1;
    else if (state === 'unknown') unknown += 1;
    else if (state === 'unprobed') unprobed += 1;
  }
  const measured = {
    ...baseMeasured(facts.data),
    images: images.length,
    heavy,
    unknown,
    unprobed,
  };
  if (heavy === 1) {
    return finding(
      'qualite.images_poids',
      'fail',
      2,
      2,
      'qualite.images_poids.fail_one',
      { measured },
    );
  }
  if (heavy > 1) {
    return finding(
      'qualite.images_poids',
      'fail',
      2,
      2,
      'qualite.images_poids.fail_many',
      { params: { count: heavy }, measured },
    );
  }
  if (unprobed === images.length && facts.data.budgetStopped) {
    return finding(
      'qualite.images_poids',
      'untested',
      1,
      1,
      'qualite.untested_budget',
      { measured },
    );
  }
  const missing = unknown + unprobed;
  if (missing === 1) {
    return finding(
      'qualite.images_poids',
      'warn',
      2,
      1,
      'qualite.images_poids.warn_unknown_one',
      { measured },
    );
  }
  if (missing > 1) {
    return finding(
      'qualite.images_poids',
      'warn',
      2,
      1,
      'qualite.images_poids.warn_unknown_many',
      { params: { count: missing }, measured },
    );
  }
  return finding(
    'qualite.images_poids',
    'pass',
    1,
    1,
    'qualite.images_poids.pass',
    { measured },
  );
}

export function judgeImageDimensions(facts: QualityFacts): CheckResult {
  const gated = gate('qualite.images_dimensions', facts);
  if (gated) return gated;
  if (facts.kind !== 'ok') {
    return gate('qualite.images_dimensions', facts) as CheckResult;
  }
  const images = facts.data.images;
  if (images.length === 0) {
    return finding(
      'qualite.images_dimensions',
      'na',
      1,
      1,
      'qualite.images_dimensions.na',
      { measured: baseMeasured(facts.data) },
    );
  }
  const missing = images.filter((image) => !image.width || !image.height);
  const measured = {
    ...baseMeasured(facts.data),
    images: images.length,
    missing: missing.length,
  };
  if (missing.length === images.length) {
    return finding(
      'qualite.images_dimensions',
      'fail',
      2,
      2,
      'qualite.images_dimensions.fail',
      { measured },
    );
  }
  if (missing.length === 1) {
    return finding(
      'qualite.images_dimensions',
      'warn',
      2,
      2,
      'qualite.images_dimensions.warn_one',
      { measured },
    );
  }
  if (missing.length > 1) {
    return finding(
      'qualite.images_dimensions',
      'warn',
      2,
      2,
      'qualite.images_dimensions.warn_many',
      { params: { count: missing.length }, measured },
    );
  }
  return finding(
    'qualite.images_dimensions',
    'pass',
    1,
    1,
    'qualite.images_dimensions.pass',
    { measured },
  );
}

export function judgeImageFormat(facts: QualityFacts): CheckResult {
  const gated = gate('qualite.images_format', facts);
  if (gated) return gated;
  if (facts.kind !== 'ok')
    return gate('qualite.images_format', facts) as CheckResult;
  const sizes = sizeMap(facts.data.sizes);
  const raster = facts.data.images.filter((image) => !isSvg(image, sizes));
  if (raster.length === 0) {
    return finding(
      'qualite.images_format',
      'na',
      1,
      1,
      'qualite.images_format.na',
      { measured: baseMeasured(facts.data) },
    );
  }
  const legacy = raster.filter((image) => !isModern(image, sizes));
  const measured = {
    ...baseMeasured(facts.data),
    images: raster.length,
    legacy: legacy.length,
  };
  if (legacy.length === raster.length) {
    return finding(
      'qualite.images_format',
      'fail',
      2,
      2,
      'qualite.images_format.fail',
      { measured },
    );
  }
  if (legacy.length === 1) {
    return finding(
      'qualite.images_format',
      'warn',
      1,
      2,
      'qualite.images_format.warn_one',
      { measured },
    );
  }
  if (legacy.length > 1) {
    return finding(
      'qualite.images_format',
      'warn',
      1,
      2,
      'qualite.images_format.warn_many',
      { params: { count: legacy.length }, measured },
    );
  }
  return finding(
    'qualite.images_format',
    'pass',
    1,
    1,
    'qualite.images_format.pass',
    { measured },
  );
}

function gate(id: string, facts: QualityFacts): CheckResult | null {
  if (facts.kind === 'ok') return null;
  if (facts.kind === 'robots') {
    return finding(id, 'na', 1, 1, 'qualite.na_robots');
  }
  if (facts.kind === 'robots_status') {
    return finding(id, 'untested', 1, 1, 'qualite.untested_robots', {
      params: { status: facts.status },
      measured: { status: facts.status },
    });
  }
  if (facts.kind === 'robots_down') {
    return finding(id, 'untested', 1, 1, 'qualite.untested_robots_down');
  }
  if (facts.kind === 'status') {
    return finding(id, 'untested', 1, 1, 'qualite.untested_status', {
      params: { status: facts.status },
      measured: { status: facts.status },
    });
  }
  if (facts.kind === 'down') {
    return finding(id, 'untested', 1, 1, 'qualite.untested_down');
  }
  if (facts.kind === 'not_html') {
    return finding(id, 'na', 1, 1, 'qualite.na_not_html');
  }
  if (facts.kind === 'left') {
    return finding(id, 'na', 1, 1, 'qualite.na_scope');
  }
  return finding(id, 'untested', 1, 1, 'qualite.untested_budget');
}

function baseMeasured(data: CrawlData): Record<string, unknown> {
  return {
    pages: data.pages.length,
    truncated: data.truncated,
    budgetStopped: data.budgetStopped,
  };
}

function samples(...groups: LinkHit[][]): string[] {
  const urls: string[] = [];
  for (const group of groups) {
    for (const hit of group) {
      if (urls.length >= SAMPLE) return urls;
      urls.push(hit.url);
    }
  }
  return urls;
}

function sizeMap(sizes: readonly ResourceSize[]): Map<string, ResourceSize> {
  return new Map(sizes.map((size) => [size.url, size]));
}

function weightOf(
  image: ImageFact,
  sizes: Map<string, ResourceSize>,
): 'heavy' | 'light' | 'unknown' | 'unprobed' {
  if (image.urls.length === 0) return 'unknown';
  let saw = false;
  let unknown = false;
  for (const url of image.urls) {
    const size = sizes.get(url);
    if (!size) continue;
    saw = true;
    if (size.bytes === null) unknown = true;
    else if (size.bytes > IMAGE_MAX_BYTES) return 'heavy';
  }
  if (!saw) return 'unprobed';
  if (unknown) return 'unknown';
  return 'light';
}

function isSvg(image: ImageFact, sizes: Map<string, ResourceSize>): boolean {
  if (image.svg) return true;
  return image.urls.some((url) => sizes.get(url)?.type === 'image/svg+xml');
}

function isModern(image: ImageFact, sizes: Map<string, ResourceSize>): boolean {
  if (image.modernMarkup) return true;
  return image.urls.some((url) => {
    const type = sizes.get(url)?.type;
    return type === 'image/webp' || type === 'image/avif';
  });
}
