import {
  apiDepsFromEnv,
  createLogger,
  handleCreate,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleCreate(
      req,
      apiDepsFromEnv({ env: process.env, requestUrl: req.url, logger }),
    ),
  );
};

export const config = { path: '/api/audits', method: 'POST' };
