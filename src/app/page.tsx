import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ChatShell from "@/components/ChatShell";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return <ChatShell userEmail={session.user.email ?? "user"} />;
}
