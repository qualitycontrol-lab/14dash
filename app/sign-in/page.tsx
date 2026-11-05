import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SignInContent from "@/app/sign-in-content";

export default async function SignInPage() {
  const session = await getServerSession();

  if (session?.user?.email) {
    redirect("/");
  }

  return <SignInContent />;
}
