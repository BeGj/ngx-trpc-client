/* eslint-disable @typescript-eslint/no-explicit-any */
import { InjectionToken, Provider, signal, TransferState } from '@angular/core';
import 'isomorphic-fetch';
import {
  httpBatchLink,
  HttpBatchLinkOptions,
  CreateTRPCClientOptions,
  HTTPHeaders,
} from '@trpc/client';
import { AnyRouter } from '@trpc/server';
import { transferStateLink } from './links/transfer-state-link';
import {
  provideTrpcCacheState,
  provideTrpcCacheStateStatusManager,
  tRPC_CACHE_STATE,
} from './cache-state';
import { createTRPCRxJSProxyClient } from './trpc-rxjs-proxy';
// @ts-expect-error because analog.js did this
import { FetchEsque } from '@trpc/client/dist/internals/types';

export interface TrpcOptions<T extends AnyRouter> {
  url: string;
  serverUrl?: string;
  options?: Partial<CreateTRPCClientOptions<T>>;
  batchLinkOptions?: Omit<HttpBatchLinkOptions, 'url' | 'headers'>;
}

export type TrpcClient<AppRouter extends AnyRouter> = ReturnType<
  typeof createTRPCRxJSProxyClient<AppRouter>
>;
const tRPC_INJECTION_TOKEN = new InjectionToken<unknown>('@analogjs/trpc proxy client');

function createCustomFetch(serverUrl?: string) {
  return (input: RequestInfo | URL, init?: RequestInit & { method: 'GET' }) => {
    if ((globalThis as any).$fetch) {
      return (globalThis as any).$fetch
        .raw(input.toString(), init)
        .catch((e: any) => {
          throw e;
        })
        .then((response: any) => ({
          ...response,
          headers: response.headers,
          json: () => Promise.resolve(response._data),
        }));
    }

    if (typeof window === 'undefined') {
      const base =
        serverUrl ??
        (() => {
          const host = process.env['NITRO_HOST'] ?? process.env['ANALOG_HOST'] ?? 'localhost';
          const port = process.env['NITRO_PORT'] ?? process.env['ANALOG_PORT'] ?? 4205;
          return `http://${host}:${port}`;
        })();
      if (input instanceof Request) {
        input = new Request(base, input);
      } else {
        input = new URL(input, base);
      }
    }

    return fetch(input, init);
  };
}

export const createTrpcClient = <AppRouter extends AnyRouter>({
  url,
  serverUrl,
  options,
  batchLinkOptions,
}: TrpcOptions<AppRouter>) => {
  const TrpcHeaders = signal<HTTPHeaders>({});
  const provideTrpcClient = (): Provider[] => [
    provideTrpcCacheState(),
    provideTrpcCacheStateStatusManager(),
    {
      provide: tRPC_INJECTION_TOKEN,
      useFactory: () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore TODO: figure out why TS is complaining
        return createTRPCRxJSProxyClient<AppRouter>({
          transformer: options?.transformer,
          links: [
            ...(options?.links ?? []),
            transferStateLink(),
            httpBatchLink({
              headers() {
                return TrpcHeaders();
              },
              fetch: createCustomFetch(serverUrl) as FetchEsque,
              url: url ?? '',
              ...(batchLinkOptions ?? {}),
            }),
          ],
        });
      },
      deps: [tRPC_CACHE_STATE, TransferState],
    },
  ];
  const TrpcClient = tRPC_INJECTION_TOKEN as InjectionToken<TrpcClient<AppRouter>>;
  return {
    TrpcClient,
    provideTrpcClient,
    TrpcHeaders,
    /** @deprecated use TrpcClient instead */
    tRPCClient: TrpcClient,
    /** @deprecated use provideTrpcClient instead */
    provideTRPCClient: provideTrpcClient,
    /** @deprecated use TrpcHeaders instead */
    tRPCHeaders: TrpcHeaders,
  };
};
