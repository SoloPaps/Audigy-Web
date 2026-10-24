import {
  createLogger,
  handleRecheck,
  recheckDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/** Background : relecture quotidienne. Pas de `config.path`, appel interne signé. */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleRecheck(req, recheckDepsFromEnv({ env: process.env, logger })),
  );
};
