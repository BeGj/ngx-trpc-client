/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TRPCErrorShape {
  message: string;
  code: number;
  data: Record<string, unknown>;
}

export class TRPCClientError extends Error {
  public override readonly cause: Error | undefined;
  public readonly shape: TRPCErrorShape | undefined;
  public readonly data: Record<string, unknown> | undefined;
  public meta: Record<string, unknown> | undefined;

  constructor(
    message: string,
    opts?: {
      cause?: Error;
      shape?: TRPCErrorShape;
      meta?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = 'TRPCClientError';
    this.cause = opts?.cause;
    this.shape = opts?.shape;
    this.data = opts?.shape?.data;
    this.meta = opts?.meta;
  }

  static from(cause: unknown, opts?: { meta?: Record<string, unknown> }): TRPCClientError {
    if (cause instanceof TRPCClientError) {
      return cause;
    }

    if (
      typeof cause === 'object' &&
      cause !== null &&
      'error' in cause &&
      typeof (cause as any).error === 'object'
    ) {
      const errorShape = (cause as any).error as TRPCErrorShape;
      return new TRPCClientError(errorShape.message, {
        shape: errorShape,
        meta: opts?.meta,
      });
    }

    if (cause instanceof Error) {
      return new TRPCClientError(cause.message, {
        cause,
        meta: opts?.meta,
      });
    }

    return new TRPCClientError('Unknown error', { meta: opts?.meta });
  }
}
