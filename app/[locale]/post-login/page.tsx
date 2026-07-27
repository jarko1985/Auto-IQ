import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPostLoginPath } from "@/features/auth/route-for-role";

// Neutral landing target for auth flows that can't compute the destination
// up front (OAuth's callbackUrl is fixed before we know the signed-in user's
// role). Credentials sign-in resolves the role client-side and redirects
// directly instead of bouncing through here — see sign-in-form.tsx.
export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  redirect(getPostLoginPath(session.user.role) as never);
}
