import {
  createLogger,
  handleCreateVerification,
  secretsFromEnv,
  serve,
  verificationDepsFromEnv,
} from '@audigy/orchestrator';

export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handleCreateVerification(
      req,
      verificationDepsFromEnv({ env: process.env, logger }),
    ),
  );
};

export const config = { path: '/api/verifications', method: 'POST' };
