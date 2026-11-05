import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import {
  createGoogleOAuthClient,
  GoogleOAuthConfigurationError,
} from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session?.user?.email?.trim().toLowerCase().endsWith("@bonadmin.com")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const people = google.people({ version: "v1", auth: createGoogleOAuthClient() });
    const response = await people.people.searchDirectoryPeople({
      query,
      readMask: "names,emailAddresses",
      sources: ["DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"],
      pageSize: 8,
    });

    const employees = (response.data.people ?? [])
      .map((person) => ({
        name: person.names?.[0]?.displayName || "Unknown",
        email: person.emailAddresses?.[0]?.value || "",
      }))
      .filter((employee) => employee.email.toLowerCase().endsWith("@bonadmin.com"));

    return NextResponse.json(employees);
  } catch (error) {
    if (error instanceof GoogleOAuthConfigurationError) {
      console.error("Employee directory search is not configured:", error.message);
      return NextResponse.json(
        { error: "Employee directory search is not configured." },
        { status: 503 },
      );
    }

    console.error("Employee directory search failed:", error);
    return NextResponse.json(
      { error: "Unable to search the employee directory." },
      { status: 502 },
    );
  }
}
