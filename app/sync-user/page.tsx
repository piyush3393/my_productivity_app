import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function SyncUserPage() {
  await auth.protect();
  await syncCurrentUserToDatabase();

  redirect("/");
}
