import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

/**
 * Returns the effective userId for data fetching.
 * If the current user is an admin and `viewAs` query param is set, returns that userId.
 * Otherwise returns the current user's id.
 */
export async function resolveUserId(
  sessionUserId: string,
  sessionEmail: string | null | undefined,
  viewAs: string | undefined,
): Promise<string> {
  if (viewAs && isAdminEmail(sessionEmail)) return viewAs;
  return sessionUserId;
}

export { isAdminEmail };
