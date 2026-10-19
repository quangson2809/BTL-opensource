import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { sanitizePostgrestOrSearch } from "@/lib/list-query.mjs";
import { requireManager } from "@/lib/business";

export const dynamic = "force-dynamic";

type PersonnelPageProps = {
  searchParams: Promise<{ q?: string }>;
};

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

export default async function PersonnelPage({ searchParams }: PersonnelPageProps) {
  const query = await searchParams;
  const search = sanitizePostgrestOrSearch(query.q);
  const { supabase, accountId } = await requireManager();
  const { data, error } = await supabase
    .from("tai_khoan")
    .select("id,ho_ten,email,ma_dai_ly,manager_id,trang_thai")
    .order("ho_ten");

  if (error) {
    throw new Error("Không thể tải cây nhân sự.");
  }

  const accounts = (data ?? []) as AccountRow[];
  const rows = flattenTree(accounts, accountId);
  const visibleRows = search
    ? (() => {
        const term = search.toLocaleLowerCase("vi-VN");
        const accountsById = new Map(accounts.map((account) => [account.id, account]));
        const visibleIds = new Set<string>();

        for (const account of accounts) {
          const searchableText = [account.ho_ten, account.email, account.ma_dai_ly]
            .join(" ")
            .toLocaleLowerCase("vi-VN");
          if (!searchableText.includes(term)) continue;

          let ancestor: AccountRow | undefined = account;
          while (ancestor) {
            visibleIds.add(ancestor.id);
            ancestor = ancestor.manager_id
              ? accountsById.get(ancestor.manager_id)
              : undefined;
          }
        }

        return rows.filter(({ account }) => visibleIds.has(account.id));
      })()
    : rows;

  return (
    <main>
      <section className="card wide-card">
        <h1>Cây nhân sự</h1>
        <p>
          <Link href="/dashboard">Dashboard</Link>
        </p>
        <form className="filter-grid" method="get" role="search">
          <label>
            Tìm nhân sự
            <input
              autoComplete="off"
              defaultValue={search}
              name="q"
              placeholder="Họ tên, email hoặc mã đại lý"
            />
          </label>
          <button type="submit">Tìm kiếm</button>
          {search ? <Link className="button-link button-secondary" href="/personnel">Xóa tìm kiếm</Link> : null}
        </form>
        {visibleRows.length === 0 ? (
          <EmptyState
            title={search ? "Không tìm thấy nhân sự" : "Chưa có nhân sự trong phạm vi"}
            description={
              search
                ? "Thử từ khóa khác. Cây chỉ hiển thị nhân sự và cấp quản lý trong phạm vi được cấp quyền."
                : "Nhân sự thuộc cây quản lý của bạn sẽ xuất hiện tại đây khi có dữ liệu."
            }
          />
        ) : (
          <div className="stack">
            {visibleRows.map(({ account, depth }) => (
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
        )}
      </section>
    </main>
  );
}
