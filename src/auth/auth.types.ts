export type PublicUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  createdAt: string;
};

// expiresAt é a expiração do access token; refreshExpiresAt, a do refresh token.
export type AuthTokens = { accessToken: string; refreshToken: string; expiresAt: Date; refreshExpiresAt: Date };
export type ResolvedSession = { user: PublicUser; expiresAt: Date };

export function toPublicUser(user: Omit<PublicUser, 'createdAt'> & { createdAt: Date }): PublicUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
