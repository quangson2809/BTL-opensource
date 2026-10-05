import Link from "next/link";

import { requireBusinessAccount } from "@/lib/business";

export const dynamic = "force-dynamic";

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string;
    loai?: string;
    tinh_trang?: string;
    nhom?: string;
    status?: string;
    error?: string;
  }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const query = await searchParams;
  const { supabase } = await requireBusinessAccount();
  const { data, error } = await supabase
    .from("khach_hang")
    .select(
      "id,ma_khach_hang,ho_ten,so_dien_thoai,loai_khach_hang,tinh_trang,nhom_tinh_cach,updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Không thể tải danh sách khách hàng.");
  }

  const search = (query.q ?? "").trim().toLocaleLowerCase("vi");
  const customers = (data ?? []).filter((customer) => {
    const matchesSearch =
      !search ||
      customer.ho_ten.toLocaleLowerCase("vi").includes(search) ||
      customer.ma_khach_hang.toLocaleLowerCase("vi").includes(search) ||
      customer.so_dien_thoai.includes(search);
    const matchesType = !query.loai || customer.loai_khach_hang === query.loai;
    const matchesStatus =
      !query.tinh_trang || customer.tinh_trang === query.tinh_trang;
    const matchesGroup = !query.nhom || customer.nhom_tinh_cach === query.nhom;
    return matchesSearch && matchesType && matchesStatus && matchesGroup;
  });

  return (
    <main>
      <section className="card wide-card">
        <h1>Khách hàng của tôi</h1>
        <div className="actions">
          <Link href="/dashboard">Dashboard</Link>
          <Link className="button-link" href="/customers/new">
            Thêm khách hàng
          </Link>
        </div>

        {query.status === "deleted" ? (
          <p className="message success">Đã xóa khách hàng.</p>
        ) : null}
        {query.error ? (
          <p className="message error">Không thể xử lý yêu cầu.</p>
        ) : null}

        <form className="filter-grid" method="get">
          <label>
            Tìm kiếm
            <input
              defaultValue={query.q ?? ""}
              name="q"
              placeholder="Tên, mã hoặc số điện thoại"
            />
          </label>
          <label>
            Loại
            <select defaultValue={query.loai ?? ""} name="loai">
              <option value="">Tất cả</option>
              <option value="MUC_TIEU">Mục tiêu</option>
              <option value="NUOI_DUONG">Nuôi dưỡng</option>
              <option value="DOI_TAC">Đối tác</option>
            </select>
          </label>
          <label>
            Tình trạng
            <select defaultValue={query.tinh_trang ?? ""} name="tinh_trang">
              <option value="">Tất cả</option>
              <option value="BẠN">BẠN</option>
              <option value="BÀN">BÀN</option>
              <option value="BÁN">BÁN</option>
              <option value="BÁM">BÁM</option>
            </select>
          </label>
          <label>
            Nhóm tính cách
            <select defaultValue={query.nhom ?? ""} name="nhom">
              <option value="">Tất cả</option>
              <option value="D">D</option>
              <option value="I">I</option>
              <option value="S">S</option>
              <option value="C">C</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>

        <div className="stack">
          {customers.length === 0 ? <p>Chưa có khách hàng phù hợp.</p> : null}
          {customers.map((customer) => (
            <article className="card" key={customer.id}>
              <p>
                <strong>{customer.ho_ten}</strong> — {customer.ma_khach_hang}
              </p>
              <p>{customer.so_dien_thoai}</p>
              <p className="secondary-text">
                {customer.loai_khach_hang} · {customer.tinh_trang} ·{" "}
                {customer.nhom_tinh_cach}
              </p>
              <p className="secondary-text">
                <Link href={\`/customers/\${customer.id}\`}>Xem chi tiết</Link>
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
