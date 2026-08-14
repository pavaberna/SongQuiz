export type AuthUser = {
  email: string;
  googleSubject: string;
  isAdmin: boolean;
  name: string | null;
  picture: string | null;
};

export type AuthResponse = {
  user: AuthUser;
};
