import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminContent from "./admin-content";
import { isAdminEmail } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  if (!isAdminEmail(session.user.email)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eff3f1] px-4 py-12 text-[#11201d]">
        <section className="w-full max-w-[520px] rounded-[26px] border border-[#d7e1dd] bg-[#f8fbf9] p-8 text-center shadow-[0_20px_60px_rgba(27,59,53,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f5d9df] text-lg font-semibold text-[#a94856]">
            !
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em]">Admin access required</h1>
          <p className="mt-3 leading-7 text-[#536663]">
            This Google account isn’t on the admin allowlist. Contact your administrator if you need access.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[#1aa6a1] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#148d88]"
          >
            Return to training portal
          </Link>
        </section>
      </main>
    );
  }

  return <AdminContent adminName={session.user.name ?? "Administrator"} />;
}
