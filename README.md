# ngx-trpc-client

Forked from https://github.com/analogjs/analog/tree/beta/packages/trpc because of https://github.com/analogjs/analog/issues/1894

## Getting started

### Server

- If you are using Angular SSR you may look at the demo application for how to add trpc to your existing AngularSSR express api, or visit https://trpc.io/docs/server/adapters/express
- If you are hosting TRPC in a separate express or other framework, please look at the TRPC documentation for how to set it up using your framework.

If you would like to have AngularSSR with other API frameworks than Express you may get some inspiration from this repo https://github.com/JeanMeche/ssr-v19 where they showcase AngularSSR with Elysia, Fastify, H3, Hono and ExpressJs. I hope that repo is still maintained by the time you read this.

The important part is to know the server url and route in the client, and to be able to import your appRouter type into the frontend.

### Client

#### Install

`pnpm install ngx-trpc-client superjson @trpc/server`

`@trpc/server` is a peer dependency — you need it for the `AppRouter` type import. The library supports `@trpc/server` v10 and v11.

#### Configure

Create a file like [trpc-client.ts](./projects/demo/src/app/trpc-client.ts) with import to your AppRouter type and route to your trpc endpoint

Should look like

```ts
// trpc-client.ts
import { AppRouter } from '../trpc/appRouter'; // Imported from wherever you have your TRPC server in your repo/monorepo.
import { createTrpcClient } from 'ngx-trpc-client';
import SuperJSON from 'superjson';

export const { provideTrpcClient, TrpcClient } = createTrpcClient<AppRouter>({
  url: '/api/trpc', // Remember to set the right route
  options: {
    transformer: SuperJSON,
  },
});
```

#### Providers

Add `provideTrpcClient()` to your [app.config.ts](./projects/demo/src/app/app.config.ts) imported from file above.

```ts
// app.config.ts
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideTrpcClient } from './trpc-client'; // This line, but your path

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideTrpcClient(), // and this line
  ],
};
```

#### Usage

Inject `TrpcClient` where needed like in [blog.ts](./projects/demo/src/app/pages/blog/blog.ts)

Example:

```ts
// blog.component.ts
import { Component, inject } from '@angular/core';
import { TrpcClient } from '../../trpc-client';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-blog',
  imports: [],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
})
export class Blog {
  private trpc = inject(TrpcClient); // Inject TRPC
  private route = inject(ActivatedRoute);

  private blogId = toSignal(this.route.params.pipe(map((params) => Number(params['blogId']))));

  postResource = rxResource({
    stream: ({ params }) =>
      this.trpc.post.getPosts.query({
        // Use it wherever you want
        blogId: params.blogId,
      }),
    params: () => ({ blogId: this.blogId() }),
  });
}
```

## Why do you need this library to use TRPC with Angular?

Using TRPC with Angular is not very well documented, but if you are not using AngularSSR then it is pretty straight forward to get it working. You may use this repo as an example for your own implementation, or install it and use the client with most bugs fixed out of the box.

This library improves tRPC's integration with Angular using RxJs and ensures that requests are not duplicated on the server when prerendering and on the client. This is a typical problem you meet when you try to do it yourself without this library.

## Why use TRPC

With TRPC you get strongly typed API requests, so you don't have to either hope your API input and output parameters won't change and break your application, or run manual and tiresome OpenAPI generators. When you change inputs or outputs in TRPC the types will instantly change in the frontend code and show you errors before runtime.

TRPC is not for everyone, but if you use a BFF (Backend-For-Frontend) pattern we have found it extremely useful.

# Contribution

Library is open for contributions! Please make an issue or a pull request

## Getting started contributing

- Clone the repo or a fork of it `git clone git@github.com:BeGj/ngx-trpc-client.git`
- Install dependencies using pnpm `pnpm i`. If you dont have pnpm install it using npm or corepack
- Build library to dist `ng build ngx-trpc-client`
- Serve the demo application if you want `ng serve`

## TODO

- [x] Upgrade to TRPC v11 like this https://github.com/analogjs/analog/pull/1826
- [x] Fix duplicate TRPC request during ssr like this https://github.com/analogjs/analog/pull/1822
- [x] Publish as npm package
- [x] Set up pipelines

## Prettier

- Run `pnpm format` to format code using prettier

## Eslint

- Run `pnpm lint` to lint code using eslint

## Releasing

Releases are published to npm automatically by the [Release workflow](.github/workflows/release.yml), triggered by pushing a `v*` git tag. The published version comes from `projects/ngx-trpc-client/package.json` — the tag only triggers the workflow, so the two must match.

To cut a release:

1. **Bump the version** in the library package (run inside the library folder so it edits the right `package.json`):

   ```bash
   cd projects/ngx-trpc-client
   npm version patch   # or minor / major — bumps package.json and creates a vX.Y.Z commit + tag
   cd ../..
   ```

2. **Update the changelog.** Add a dated section to the root [`CHANGELOG.md`](CHANGELOG.md) matching the new version:

   ```markdown
   ## [0.0.2] - 2026-06-21

   ### Added

   - ...
   ```

   > Only edit the root `CHANGELOG.md`. `build:lib` copies it into the package at build time, so `projects/ngx-trpc-client/CHANGELOG.md` is generated and gitignored.

3. **Push the commit and the tag:**

   ```bash
   git push && git push --tags
   ```

Pushing the tag runs the release, which enforces three gates before publishing and fails fast if any is unmet:

1. The tag (`vX.Y.Z`) matches the version in `projects/ngx-trpc-client/package.json`.
2. `CHANGELOG.md` has a dated `## [X.Y.Z] - <date>` entry for that version.
3. CI passes (lint, build, test).

Publishing uses npm **OIDC trusted publishing** — no `NPM_TOKEN` secret is needed and provenance is attached automatically. This relies on a one-time setup on npmjs.com: the `ngx-trpc-client` package → **Settings → Trusted Publisher** must point at repository `BeGj/ngx-trpc-client` and workflow `release.yml`.
