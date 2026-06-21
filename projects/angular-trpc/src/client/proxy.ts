/* eslint-disable @typescript-eslint/no-explicit-any */
interface ProxyCallbackOptions {
  path: string[];
  args: unknown[];
}

type ProxyCallback = (opts: ProxyCallbackOptions) => unknown;

const noop = () => {};

function createInnerProxy(callback: ProxyCallback, path: string[]): unknown {
  return new Proxy(noop, {
    get(_target, key) {
      if (typeof key !== 'string' || key === 'then') {
        return undefined;
      }
      return createInnerProxy(callback, [...path, key]);
    },
    apply(_target, _thisArg, args) {
      const isApply = path[path.length - 1] === 'apply';
      return callback({
        args: isApply ? (args.length >= 2 ? args[1] : []) : args,
        path: isApply ? path.slice(0, -1) : path,
      });
    },
  });
}

export function createRecursiveProxy(callback: ProxyCallback): unknown {
  return createInnerProxy(callback, []);
}

export function createFlatProxy<TFaux>(callback: (path: string & keyof TFaux) => unknown): TFaux {
  return new Proxy(noop, {
    get(_target, name) {
      if (typeof name !== 'string' || name === 'then') {
        return undefined;
      }
      return callback(name as string & keyof TFaux);
    },
  }) as TFaux;
}
