import Link from "next/link";

import { requireManager } from "@/lib/business";

export const dynamic = "force-dynamic";

type AccountRow = {
  id: string;
  ho_ten: string;
  email: string;
  ma_dai_ly: string;
  manager_id: string | null;
  trang_thai: string;
};

function flattenTree(accounts: AccountRow[], rootId: string) {
  const byManager = new Map<string, AccountRow[]>();
  for (const account of accounts) {
    const key = account.manager_id ?? "ROOT";
    byManager.set(key, [...(byManager.get(key) ?? []), account]);
  }

  const output: Array<{ account: AccountRow; depth: number }> = [];
  const visited = new Set<string>();

  const visit = (account: AccountRow, depth: number) => {
    if (visited.has(account.id)) {
      return;
    }
    visited.add(account.id);
    output.push({ account, depth });
    for (const child of byManager.get(account.id) ?? []) {
      visit(child, depth + 1);
    }
  };

  const root = accounts.find((account) => account.id === rootId);
  if (root) {
    visit(root, 0);
  }

  return output;
}

export default async function PersonnelPage() {
  const { supabase, accountId } = await requireManager();
  const { data, error } = await supabase
    .from("tai_khoan")
    .select("id,ho_ten,email,ma_dai_ly,manager_id,trang_thai")
    .order("ho_ten");

  if (error) {
    throw new Error("Không thể tải cây nhân sự.");
  }

  const rows = flattenTree((data ?? []) as AccountRow[], accountId);

  return (
    <main>
      <section className="card wide-card">
        <h1>Cây nhân sự</h1>
        <p>
          <Link href="/dashboard">Dashboard</Link>
        </p>
        <div className="stack">
          {rows.map(({ account, depth }) => (
            <article
              className="personnel-row"
              key={account.id}
              style={{ marginLeft: `${Math.min(depth, 6) * 1.5}rem` }}
            >
              <p>
                <strong>{account.ho_ten}</strong> — {account.ma_dai_ly}
              </p>
              <p className="secondary-text">
                {account.email} · {account.trang_thai}
              </p>
              <Link href={`/personnel/${account.id}`}>
                Xem chi tiết và thống kê
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
