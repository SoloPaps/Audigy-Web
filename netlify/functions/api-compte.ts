import {
  accountDepsFromEnv,
  createLogger,
  handleAccount,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

/** Export JSON, acceptation des CGU, suppression du compte. */
export default async (
  req: Request,
  context: { params?: Record<string, string> },
): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  const action =
    context.params?.action ?? new URL(req.url).pathname.split('/').pop();
  return serve(logger, async () =>
    handleAccount(
      req,
      accountDepsFromEnv({ env: process.env, logger }),
      action,
    ),
  );
};

export const config = {
  path: '/api/compte/:action',
  method: ['GET', 'POST'],
};
