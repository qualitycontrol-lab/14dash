import type { Metadata } from "next";
import CheckInContent from "./check-in-content";

export const metadata: Metadata = {
  title: "Training Check-In | BON Training",
  description: "Search for your name and confirm your training attendance.",
};

export default function CheckInPage() {
  return <CheckInContent />;
}
