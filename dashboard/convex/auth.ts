import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
});

/**
 * Mutation/query guard: returns the authenticated user id (Convex auth user table).
 * Throws "Not authenticated" if no user identity. Optionally enforces a GitHub-username
 * allowlist via the `ALLOWED_GITHUB_USERS` env var (comma-separated).
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<{
  userId: string;
  identityName: string;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // GitHub OIDC populates `name` (GitHub login) and `email`. Allowlist is optional;
  // when unset we trust any successful sign-in (single-user case).
  const allowlist = (process.env.ALLOWED_GITHUB_USERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const handle = (identity.nickname ?? identity.name ?? "").toLowerCase();
  if (allowlist.length > 0 && !allowlist.includes(handle)) {
    throw new Error(`User ${handle || "(unknown)"} is not on the allowlist`);
  }

  return {
    userId: identity.subject,
    identityName: identity.name ?? identity.nickname ?? identity.subject,
  };
}
