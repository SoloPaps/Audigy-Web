import {
  apiDepsFromEnv,
  createLogger,
  handleGet,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

export default async (
  req: Request,
  context: { params?: Record<string, string> },
): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleGet(
      req,
      apiDepsFromEnv({ env: process.env, requestUrl: req.url, logger }),
      context.params?.id,
    ),
  );
};

export const config = { path: '/api/audits/:id', method: 'GET' };
