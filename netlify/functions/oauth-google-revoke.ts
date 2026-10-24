import {
  createLogger,
  handleOauthRevoke,
  oauthDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleOauthRevoke(req, oauthDepsFromEnv({ env: process.env, logger })),
  );
};

export const config = { path: '/api/oauth/google/revoke', method: 'POST' };
