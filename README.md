# ngx-trpc-client

Forked from https://github.com/analogjs/analog/tree/beta/packages/trpc because of https://github.com/analogjs/analog/issues/1894

## Getting started

### Server

- If you are using Angular SSR you may look at the demo application for how to add trpc to your existing AngularSSR express api, or visit https://trpc.io/docs/v10/server/adapters/express
- If you are hosting TRPC in a seperate express or other framework, please look at the TRPC documentation for how to set it up using your framework.

If you would like to have AngularSSR with other API frameworks than Express you may get some inspiration from this repo https://github.com/JeanMeche/ssr-v19 where they showcase AngularSSR with Elysia, Fastify, H3, Hono and ExpressJs. I hope that repo is still maintained by the time you read this.

The important part is to know the server url and route in the client, and to be able to import your appRouter type into the frontend.

### Client

#### Install

`pnpm install ngx-trpc-client superjson`

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

  postResouce = rxResource({
    stream: ({ params }) =>
      this.trpc.post.getPosts.query({
        // Use it wherver you want
        blogId: params.blogId,
      }),
    params: () => ({ blogId: this.blogId() }),
  });
}
```

## Why do you need this library to use TRPC with Angular?

Using TRPC with Angular is not very well documented, but if you are not using AngularSSR then it is pretty straight forward to get it working. You may use this repo as an example for your own implementation, or install it and use the client with most bugs fixed out of the box.

This library improves TRPCs integration with Angular using RxJs and ensures that Requests are not duplicated on the server when prerendering and on the client. This is typical problem you meet when you try to do it yourself without this library.

## Why use TRPC

With TRPC you get strongly typed API requests and you don't have either hope your API input and output paramaters change and break your application, or run manual and tiresome OpenAPI generators. When you change inputs or outputs in TRPC the types will instantly change in the frontend code and show you errors before runtime.

TRPC is not for everyone, but if you use a BFF (Backend-For-Frontend) pattern we have found it extremely usefull.

# Contribution

Library is open for contributions! Please make an issue or a merge request

## Getting started contibuting

- Clone the repo or a fork of it `git clone git@github.com:BeGj/ngx-trpc-client.git`
- Install dependencies using pnpm `pnpm i`. If you dont have pnpm install it using npm or corepack
- Build library to dist `ng build ngx-trpc-client`
- Serve the demo applicaiton if you want `ng serve`

## TODO

- [ ] Upgrade to TRPC v11 like this https://github.com/analogjs/analog/pull/1826
- [x] Fix duplicate TRPC request during ssr like this https://github.com/analogjs/analog/pull/1822
- [ ] Publish as npm library
- [ ] Set up pipelines

## Prettier

- Run `pnpm format` to format code using prettier

## Eslint

- Run `pnpm lint` to lint code using eslint
