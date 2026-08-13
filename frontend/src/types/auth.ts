export type AuthUser = {
  email: string;
  googleSubject: string;
  name: string | null;
  picture: string | null;
};

export type AuthResponse = {
  user: AuthUser;
};
