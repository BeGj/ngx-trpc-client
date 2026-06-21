/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: { env: Record<string, string | undefined> };

import { InjectionToken, Provider, signal, TransferState } from '@angular/core';
import type { AnyRouter } from '@trpc/server';
import { transferStateLink } from './links/transfer-state-link';
import {
  provideTrpcCacheState,
  provideTrpcCacheStateStatusManager,
  tRPC_CACHE_STATE,
} from './cache-state';
import { createTRPCRxJSProxyClient } from './trpc-client';
import type { CreateTRPCClientOptions, HTTPHeaders } from './types';
import { httpLink, type HttpLinkOptions } from './http-link';

export interface TrpcOptions<T extends AnyRouter> {
  url: string;
  serverUrl?: string;
  options?: Partial<CreateTRPCClientOptions<T>>;
  httpLinkOptions?: Omit<HttpLinkOptions, 'url' | 'headers'>;
}

export type TrpcClient<AppRouter extends AnyRouter> = ReturnType<
  typeof createTRPCRxJSProxyClient<AppRouter>
>;

const tRPC_INJECTION_TOKEN = new InjectionToken<unknown>('@analogjs/trpc proxy client');

function createCustomFetch(serverUrl?: string) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
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
        input = new URL(input.toString(), base);
      }
    }

    return fetch(input, init);
  };
}

export const createTrpcClient = <AppRouter extends AnyRouter>({
  url,
  serverUrl,
  options,
  httpLinkOptions,
}: TrpcOptions<AppRouter>) => {
  const TrpcHeaders = signal<HTTPHeaders>({});
  const provideTrpcClient = (): Provider[] => [
    provideTrpcCacheState(),
    provideTrpcCacheStateStatusManager(),
    {
      provide: tRPC_INJECTION_TOKEN,
      useFactory: () => {
        return createTRPCRxJSProxyClient<AppRouter>({
          transformer: options?.transformer,
          links: [
            ...(options?.links ?? []),
            transferStateLink(),
            httpLink({
              url: url ?? '',
              headers: () => TrpcHeaders(),
              fetch: createCustomFetch(serverUrl),
              ...(httpLinkOptions ?? {}),
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
