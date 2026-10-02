import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const accountId = claimsData?.claims?.sub;

  if (claimsError || typeof accountId !== "string") {
    redirect("/login");
  }

  const { data: account } = await supabase
    .from("tai_khoan")
    .select("ho_ten,email,trang_thai")
    .eq("id", accountId)
    .maybeSingle();

  if (!account) {
    redirect("/access-denied");
  }

  return (
    <main>
      <section className="card">
        <h1>Xin chào, {account.ho_ten}</h1>
        <p>{account.email}</p>
        <p className="secondary-text">Trạng thái: {account.trang_thai}</p>
        <form action={logout}>
          <button type="submit">Đăng xuất</button>
        </form>
      </section>
    </main>
  );
}
