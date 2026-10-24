import {
  createLogger,
  handlePlaces,
  placesDepsFromEnv,
  secretsFromEnv,
  serve,
} from '@audigy/orchestrator';

export default async (req: Request): Promise<Response> => {
  const logger = createLogger({ secrets: secretsFromEnv(process.env) });
  return serve(logger, async () =>
    handlePlaces(req, placesDepsFromEnv({ env: process.env, logger })),
  );
};

export const config = {
  path: '/api/places',
  method: ['GET', 'POST'],
};
