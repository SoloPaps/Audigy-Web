import {
  createLogger,
  handleSchedule,
  scheduleDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/**
 * Toutes les 15 min. Doit tenir en 30 s (limite scheduled).
 * En dev : `netlify functions:invoke schedule-tick`.
 */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleSchedule(
      req,
      scheduleDepsFromEnv({ env: process.env, requestUrl: req.url, logger }),
    ),
  );
};

export const config = { schedule: '*/15 * * * *' };
