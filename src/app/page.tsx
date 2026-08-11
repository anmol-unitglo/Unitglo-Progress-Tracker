import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;

  switch (role) {
    case "CEO":
      redirect("/ceo/dashboard");
    case "PM":
      redirect("/pm/dashboard");
    case "DEVELOPER":
      redirect("/developer/dashboard");
    case "TESTER":
      redirect("/tester/dashboard");
    default:
      redirect("/login");
  }
}
