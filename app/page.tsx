import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession();

  if (!isAdminEmail(session?.user?.email)) {
    redirect("/sign-in");
  }

  redirect("/admin");
}
