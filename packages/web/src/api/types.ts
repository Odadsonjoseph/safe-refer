// Shared Hono environment type for the entire app
export type UserSession = {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
  applicationStatus?: string;
  role?: string;
  companyName?: string;
  [key: string]: any;
};

export type AppVariables = {
  user: UserSession | null;
  session: any | null;
};

export type AppEnv = {
  Variables: AppVariables;
};
