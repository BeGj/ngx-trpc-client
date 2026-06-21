/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AnyRouter, CombinedDataTransformer, DataTransformer } from '@trpc/server';
import type { Observable } from 'rxjs';

export type TRPCType = 'query' | 'mutation';

export type OperationContext = Record<string, unknown>;

export interface Operation<TInput = unknown> {
  id: number;
  type: TRPCType;
  input: TInput;
  path: string;
  context: OperationContext;
}

export type HTTPHeaders = Record<string, string[] | string | undefined>;

export interface OperationResult<TOutput = unknown> {
  result: { data: TOutput };
  context?: OperationContext;
}

export type OperationResultObservable<TOutput = unknown> = Observable<OperationResult<TOutput>>;

export type OperationLink<
  _TRouter extends AnyRouter = AnyRouter,
  TInput = unknown,
  TOutput = unknown,
> = (opts: {
  op: Operation<TInput>;
  next: (op: Operation<TInput>) => OperationResultObservable<TOutput>;
}) => OperationResultObservable<TOutput>;

export interface TRPCClientRuntime {
  transformer: {
    serialize: (data: any) => any;
    deserialize: (data: any) => any;
  };
  combinedTransformer: CombinedDataTransformer;
}

export type TRPCLink<TRouter extends AnyRouter> = (
  runtime: TRPCClientRuntime,
) => OperationLink<TRouter>;

export interface TRPCRequestOptions {
  context?: OperationContext;
}

export type DataTransformerOptions = CombinedDataTransformer | DataTransformer;

export interface CreateTRPCClientOptions<_TRouter extends AnyRouter> {
  transformer?: DataTransformerOptions;
  links: TRPCLink<_TRouter>[];
}
