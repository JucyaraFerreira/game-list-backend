export type PublicUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  createdAt: string;
};

export type SessionCredential = { token: string; expiresAt: Date };
export type ResolvedSession = { user: PublicUser; sessionId: string; expiresAt: Date };

export function toPublicUser(user: Omit<PublicUser, 'createdAt'> & { createdAt: Date }): PublicUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
