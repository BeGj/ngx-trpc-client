import { Observable } from 'rxjs';
import type { AnyRouter } from '@trpc/server';
import type { TRPCLink, TRPCClientRuntime, OperationLink, OperationResult, HTTPHeaders } from './types';
import { TRPCClientError } from './trpc-error';

export interface HttpLinkOptions {
  url: string;
  headers?: HTTPHeaders | (() => HTTPHeaders | Promise<HTTPHeaders>);
  fetch?: typeof globalThis.fetch;
}

export function httpLink<TRouter extends AnyRouter>(
  opts: HttpLinkOptions,
): TRPCLink<TRouter> {
  return (runtime: TRPCClientRuntime): OperationLink<TRouter> => {
    const { url, headers: headersOpt, fetch: fetchFn = globalThis.fetch } = opts;

    return ({ op }) => {
      return new Observable<OperationResult<unknown>>((subscriber) => {
        const abortController = new AbortController();

        (async () => {
          try {
            const resolvedHeaders: HTTPHeaders =
              typeof headersOpt === 'function' ? await headersOpt() : (headersOpt ?? {});

            const fetchHeaders: Record<string, string> = {};
            for (const [key, value] of Object.entries(resolvedHeaders)) {
              if (value !== undefined) {
                fetchHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
              }
            }

            const serializedInput =
              op.input !== undefined ? runtime.transformer.serialize(op.input) : undefined;

            let response: Response;

            if (op.type === 'query') {
              let queryUrl = `${url}/${op.path}`;
              if (serializedInput !== undefined) {
                queryUrl += `?input=${encodeURIComponent(JSON.stringify(serializedInput))}`;
              }
              response = await fetchFn(queryUrl, {
                method: 'GET',
                headers: fetchHeaders,
                signal: abortController.signal,
              });
            } else {
              response = await fetchFn(`${url}/${op.path}`, {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  ...fetchHeaders,
                },
                body: serializedInput !== undefined ? JSON.stringify(serializedInput) : undefined,
                signal: abortController.signal,
              });
            }

            const json = await response.json();

            if (!response.ok || 'error' in json) {
              throw TRPCClientError.from(json, {
                meta: { response, responseJSON: json },
              });
            }

            const deserializedData = runtime.transformer.deserialize(json.result.data);

            subscriber.next({
              result: { data: deserializedData },
              context: op.context,
            });
            subscriber.complete();
          } catch (err) {
            if (abortController.signal.aborted) return;
            subscriber.error(TRPCClientError.from(err));
          }
        })();

        return () => abortController.abort();
      });
    };
  };
}
