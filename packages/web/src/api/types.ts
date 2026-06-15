export type UserSession = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  // Extended fields from `users` profile table (populated via databaseHooks)
  isAdmin?: boolean;
  applicationStatus?: "incomplete" | "submitted" | "approved" | "rejected";
  role?: "affiliate" | "business" | "admin";
  companyName?: string;
  phone?: string;
  [key: string]: any;
};

export type AppVariables = {
  user: UserSession | null;
  session: any | null;
};

export type AppEnv = {
  Variables: AppVariables;
};
