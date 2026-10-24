import {
  createLogger,
  handleUnsubscribe,
  secretsFromEnv,
  serve,
  unsubscribeDepsFromEnv,
} from '@audigy/orchestrator';

/** Lien List-Unsubscribe et formulaire de confirmation. */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleUnsubscribe(
      req,
      unsubscribeDepsFromEnv({ env: process.env, logger }),
    ),
  );
};

export const config = { path: '/api/unsubscribe' };
