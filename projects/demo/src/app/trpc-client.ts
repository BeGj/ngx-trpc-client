import { AppRouter } from '../trpc/appRouter';
import { createTrpcClient } from 'angular-trpc';
import SuperJSON from 'superjson';

export const { provideTrpcClient, TrpcClient } = createTrpcClient<AppRouter>({
  url: '/api/trpc',
  serverUrl: `http://localhost:${process.env['PORT'] ?? 4200}`,
  options: {
    transformer: SuperJSON,
  },
});
