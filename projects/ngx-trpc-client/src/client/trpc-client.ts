/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  AnyMutationProcedure,
  AnyProcedure,
  AnyQueryProcedure,
  AnyRouter,
  CombinedDataTransformer,
  inferProcedureInput,
  inferProcedureOutput,
  ProcedureType,
} from '@trpc/server';
import { Observable } from 'rxjs';
import { createFlatProxy, createRecursiveProxy } from './proxy';
import { TRPCClientError } from './trpc-error';
import type {
  CreateTRPCClientOptions,
  DataTransformerOptions,
  OperationLink,
  OperationResult,
  OperationResultObservable,
  TRPCClientRuntime,
  TRPCRequestOptions,
  TRPCType,
} from './types';

interface RouterRecord {
  [key: string]: AnyProcedure | RouterRecord;
}

type ProcedureInput<TProcedure extends AnyProcedure> =
  inferProcedureInput<TProcedure> extends void | undefined
    ? [input?: void | undefined]
    : [input: inferProcedureInput<TProcedure>];

type Resolver<TProcedure extends AnyProcedure> = (
  ...args: ProcedureInput<TProcedure>
) => Observable<inferProcedureOutput<TProcedure>>;

type DecorateProcedure<TProcedure extends AnyProcedure> = TProcedure extends AnyQueryProcedure
  ? {
      query: Resolver<TProcedure>;
    }
  : TProcedure extends AnyMutationProcedure
    ? {
        mutate: Resolver<TProcedure>;
      }
    : never;

type DecoratedProcedureRecord<TProcedures extends RouterRecord> = {
  [TKey in keyof TProcedures]: TProcedures[TKey] extends AnyProcedure
    ? DecorateProcedure<TProcedures[TKey]>
    : TProcedures[TKey] extends AnyRouter
      ? DecoratedProcedureRecord<TProcedures[TKey]['_def']['record']>
      : TProcedures[TKey] extends RouterRecord
        ? DecoratedProcedureRecord<TProcedures[TKey]>
        : never;
};

const clientCallTypeMap: Record<keyof DecorateProcedure<any>, ProcedureType> = {
  query: 'query',
  mutate: 'mutation',
};

type UntypedClientProperties = 'links' | 'runtime' | 'requestId' | '$request' | 'query' | 'mutation';

type IntersectionError<TKey extends string> =
  `The property '${TKey}' in your router collides with a built-in method, rename this router or procedure on your backend.`;

export type CreateTrpcProxyClient<TRouter extends AnyRouter> =
  DecoratedProcedureRecord<TRouter['_def']['record']> extends infer TProcedureRecord
    ? UntypedClientProperties & keyof TProcedureRecord extends never
      ? TProcedureRecord
      : IntersectionError<UntypedClientProperties & keyof TProcedureRecord>
    : never;

function createTRPCRxJSClientProxy<TRouter extends AnyRouter>(client: TRPCClient<TRouter>) {
  return createFlatProxy<CreateTrpcProxyClient<TRouter>>((key) => {
    if (client.hasOwnProperty(key)) {
      return (client as any)[key as any];
    }
    return createRecursiveProxy(({ path, args }) => {
      const pathCopy = [key, ...path];
      const clientCallType = pathCopy.pop()! as keyof DecorateProcedure<any>;
      const procedureType = clientCallTypeMap[clientCallType];
      const fullPath = pathCopy.join('.');
      return (client as any)[procedureType](fullPath, ...args);
    });
  });
}

export function createTRPCRxJSProxyClient<TRouter extends AnyRouter>(
  opts: CreateTRPCClientOptions<TRouter>,
) {
  const client = new TRPCClient<TRouter>(opts);
  return createTRPCRxJSClientProxy(client);
}

function createChain<TInput = unknown, TOutput = unknown>(opts: {
  links: OperationLink<AnyRouter, TInput, TOutput>[];
  op: { id: number; type: TRPCType; path: string; input: TInput; context: Record<string, unknown> };
}): Observable<OperationResult<TOutput>> {
  return new Observable((observer) => {
    function execute(
      index = 0,
      op = opts.op,
    ): OperationResultObservable<TOutput> {
      const link = opts.links[index];
      if (!link) {
        throw new Error('No more links to execute - did you forget to add an ending link?');
      }
      return link({
        op,
        next(nextOp): OperationResultObservable<TOutput> {
          return execute(index + 1, nextOp);
        },
      });
    }

    const result$ = execute();
    const sub = result$.subscribe(observer);
    return () => sub.unsubscribe();
  });
}

class TRPCClient<TRouter extends AnyRouter> {
  private readonly links: OperationLink<TRouter>[];
  public readonly runtime: TRPCClientRuntime;
  private requestId: number;

  constructor(opts: CreateTRPCClientOptions<TRouter>) {
    this.requestId = 0;

    const combinedTransformer: CombinedDataTransformer = (() => {
      const transformer = opts.transformer as DataTransformerOptions | undefined;
      if (!transformer) {
        return {
          input: {
            serialize: (data: any) => data,
            deserialize: (data: any) => data,
          },
          output: {
            serialize: (data: any) => data,
            deserialize: (data: any) => data,
          },
        };
      }
      if ('input' in transformer) {
        return transformer as CombinedDataTransformer;
      }
      return { input: transformer, output: transformer };
    })();

    this.runtime = {
      transformer: {
        serialize: (data) => combinedTransformer.input.serialize(data),
        deserialize: (data) => combinedTransformer.output.deserialize(data),
      },
      combinedTransformer,
    };

    this.links = opts.links.map((link) => link(this.runtime));
  }

  private $request<TOutput = unknown>({
    type,
    input,
    path,
    context = {},
  }: {
    type: TRPCType;
    input: unknown;
    path: string;
    context?: Record<string, unknown>;
  }): Observable<TOutput> {
    const chain$ = createChain({
      links: this.links as OperationLink<any, any, any>[],
      op: { id: ++this.requestId, type, path, input, context },
    });

    return new Observable<TOutput>((subscriber) => {
      const sub = chain$.subscribe({
        next: (value) => subscriber.next(value.result.data as TOutput),
        error: (err) => subscriber.error(TRPCClientError.from(err)),
        complete: () => subscriber.complete(),
      });
      return () => sub.unsubscribe();
    });
  }

  public query(path: string, input?: unknown, opts?: TRPCRequestOptions) {
    return this.$request({
      type: 'query',
      path,
      input,
      context: opts?.context,
    });
  }

  public mutation(path: string, input?: unknown, opts?: TRPCRequestOptions) {
    return this.$request({
      type: 'mutation',
      path,
      input,
      context: opts?.context,
    });
  }
}
