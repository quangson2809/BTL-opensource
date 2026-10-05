import Link from "next/link";

import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

type AccountsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: accounts, error } = await supabase
    .from("tai_khoan")
    .select("id,ho_ten,email,ma_dai_ly,trang_thai,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Không thể tải danh sách tài khoản.");
  }

  return (
    <main>
      <section className="card">
        <h1>Quản trị tài khoản</h1>
        <div className="actions">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/admin/roles">Vai trò & quyền</Link>
        </div>

        {params.error ? (
          <p className="message error">Yêu cầu quản trị không hợp lệ.</p>
        ) : null}

        <div className="stack">
          {(accounts ?? []).map((account) => (
            <article className="card" key={account.id}>
              <p>
                <strong>{account.ho_ten}</strong>
              </p>
              <p>{account.email}</p>
              <p className="secondary-text">
                {account.ma_dai_ly} · {account.trang_thai}
              </p>
              <p className="secondary-text">
                <Link href={`/admin/accounts/${account.id}`}>Xem chi tiết</Link>
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
