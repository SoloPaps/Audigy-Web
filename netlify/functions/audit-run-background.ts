import {
  createLogger,
  handleRun,
  runDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/** Background (suffixe `-background`) : 15 min. Pas de `config.path`, appel interne signé. */
export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleRun(
      req,
      runDepsFromEnv({ env: process.env, requestUrl: req.url, logger }),
    ),
  );
};
