import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SignInContent from "@/app/sign-in-content";
import { isAdminEmail } from "@/lib/auth";

export default async function SignInPage() {
  const session = await getServerSession();

  if (isAdminEmail(session?.user?.email)) {
    redirect("/admin");
  }

  return <SignInContent />;
}
