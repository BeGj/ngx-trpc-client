import * as trpcExpress from '@trpc/server/adapters/express';
export const createContext = async ({ req }: trpcExpress.CreateExpressContextOptions) => {
  async function getUserFromHeader() {
    if (req.headers.authorization) {
      const jwt = req.headers.authorization.split(' ')[1];
      // Validate JWT and fetch user info
      // For demo purposes, we'll just return a mock user
      return {
        user: { id: '123', name: 'Demo User', roles: ['user', 'admin'], token: jwt },
        error: null,
      };
    } else {
      return { user: null, error: 'No authorization header' };
    }
  }

  return {
    auth: await getUserFromHeader(),
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
