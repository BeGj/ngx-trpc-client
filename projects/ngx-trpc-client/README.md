# ngx-trpc-client

Type-safe tRPC client for Angular with RxJS observables and SSR transfer state support.

## Features

- End-to-end type safety from your tRPC router to Angular components
- Returns RxJS Observables, works with `rxResource` and `async` pipe
- SSR transfer state link prevents double-fetching during hydration
- Supports both `@trpc/server` v10 and v11
- Zero dependency on `@trpc/client`

## Installation

```bash
pnpm add ngx-trpc-client @trpc/server superjson
```

## Setup

### 1. Create the tRPC client

```typescript
// trpc-client.ts
import { AppRouter } from '../server/trpc/appRouter';
import { createTrpcClient } from 'ngx-trpc-client';
import SuperJSON from 'superjson';

export const { provideTrpcClient, TrpcClient } = createTrpcClient<AppRouter>({
  url: '/api/trpc',
  options: {
    transformer: SuperJSON,
  },
});
```

### 2. Provide in your app config

```typescript
// app.config.ts
import { provideTrpcClient } from './trpc-client';

export const appConfig: ApplicationConfig = {
  providers: [
    provideTrpcClient(),
    // ...
  ],
};
```

### 3. Use in components

```typescript
import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TrpcClient } from './trpc-client';

@Component({ ... })
export class MyComponent {
  private trpc = inject(TrpcClient);

  blogs = rxResource({
    stream: () => this.trpc.blog.getBlogs.query(),
  });
}
```

## SSR Configuration

For Angular SSR, provide a `serverUrl` so server-side fetches resolve correctly:

```typescript
export const { provideTrpcClient, TrpcClient } = createTrpcClient<AppRouter>({
  url: '/api/trpc',
  serverUrl: typeof process !== 'undefined'
    ? `http://localhost:${process.env['PORT'] ?? 4200}`
    : undefined,
  options: {
    transformer: SuperJSON,
  },
});
```

The built-in transfer state link automatically caches query results during SSR and replays them on the client to prevent double-fetching.

## Dynamic Headers

Use `TrpcHeaders` to set headers dynamically (e.g., for authentication):

```typescript
const { TrpcHeaders, provideTrpcClient, TrpcClient } = createTrpcClient<AppRouter>({
  url: '/api/trpc',
});

// In a service or component:
TrpcHeaders.set({ authorization: `Bearer ${token}` });
```

## License

MIT
