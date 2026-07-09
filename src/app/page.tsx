import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";

// The marketing landing page (docs/outrun/02) is a later build phase.
// For now the root route just routes people to the right place.
export default async function RootPage() {
  const session = await getCurrentSession();
  redirect(session ? "/welcome" : "/sign-up");
}
