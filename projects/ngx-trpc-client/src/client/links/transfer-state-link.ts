import { inject, makeStateKey, type StateKey, TransferState } from '@angular/core';
import type { AnyRouter } from '@trpc/server';
import { Observable } from 'rxjs';
import { tRPC_CACHE_STATE } from '../cache-state';
import type { TRPCLink, OperationResult, Operation } from '../types';
import superjson from 'superjson';

function makeCacheKey(request: Operation<unknown>): StateKey<string> {
  const { type, path, input } = request;
  const encodedParams = Object.entries(input ?? {}).reduce(
    (prev, [key, value]) => prev + `${key}=${JSON.stringify(value)}`,
    '',
  );
  const key = type + '.' + path + '?' + encodedParams;
  const hash = generateHash(key);
  return makeStateKey(hash);
}

function generateHash(value: string): string {
  let hash = 0;
  for (const char of value) {
    hash = (Math.imul(31, hash) + char.charCodeAt(0)) << 0;
  }
  hash += 2147483647 + 1;
  return hash.toString();
}

export const transferStateLink =
  <AppRouter extends AnyRouter>(): TRPCLink<AppRouter> =>
  () => {
    const { isCacheActive } = inject(tRPC_CACHE_STATE);
    const transferState = inject(TransferState);
    const isBrowser = typeof window === 'object';

    return ({ next, op }) => {
      if (op.type !== 'query') {
        return next(op);
      }

      const storeKey = makeCacheKey(op);
      const storeValue = transferState.get(storeKey, null);

      if (isBrowser && storeValue) {
        transferState.remove(storeKey);
        return new Observable<OperationResult<unknown>>((observer) => {
          observer.next(superjson.parse(storeValue));
          observer.complete();
        });
      }

      const shouldCache = !isBrowser || isCacheActive.getValue();

      if (!shouldCache) {
        return next(op);
      }

      return new Observable<OperationResult<unknown>>((observer) => {
        const sub = next(op).subscribe({
          next(value) {
            transferState.set(storeKey, superjson.stringify(value));
            observer.next(value);
          },
          error(err) {
            transferState.remove(storeKey);
            observer.error(err);
          },
          complete() {
            observer.complete();
          },
        });
        return () => sub.unsubscribe();
      });
    };
  };
