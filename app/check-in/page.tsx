import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import CheckInContent from "./check-in-content";

export default async function CheckInPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  return <CheckInContent />;
}
