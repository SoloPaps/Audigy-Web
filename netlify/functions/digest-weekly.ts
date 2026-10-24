import {
  createLogger,
  digestDepsFromEnv,
  handleDigest,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/**
 * Lundi 8 h Paris. 6 h UTC (été) et 7 h UTC (hiver) ; le handler ignore l’autre.
 * En dev : `netlify functions:invoke digest-weekly --query run=1`.
 */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleDigest(
      req,
      digestDepsFromEnv({ env: process.env, requestUrl: req.url, logger }),
    ),
  );
};

export const config = { schedule: '0 6,7 * * 1' };
