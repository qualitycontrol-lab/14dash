import { POST as recordAttendance } from "@/app/api/employees/check-in/route";

export async function POST(request: Request) {
  return recordAttendance(request);
}
