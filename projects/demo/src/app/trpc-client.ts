import { AppRouter } from '../trpc/appRouter';
import { createTrpcClient } from 'ngx-trpc-client';
import SuperJSON from 'superjson';

export const { provideTrpcClient, TrpcClient } = createTrpcClient<AppRouter>({
  url: '/api/trpc',
  serverUrl: typeof process !== 'undefined' ? `http://localhost:${process.env['PORT'] ?? 4200}` : undefined,
  options: {
    transformer: SuperJSON,
  },
});
