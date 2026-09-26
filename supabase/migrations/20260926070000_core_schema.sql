-- Phase 1: core database schema for IDAILY.
-- Canonical source: docs/source/Bao-cao-mon-opensource.pdf, section 2.3.

create table public.tai_khoan (
  id uuid primary key,
  ho_ten text not null,
  email text not null,
  so_dien_thoai text not null,
  ma_dai_ly text not null,
  manager_id uuid,
  trang_thai text not null default 'CHO_PHE_DUYET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tai_khoan_auth_user_fk
    foreign key (id) references auth.users(id) on delete restrict,
  constraint tai_khoan_manager_fk
    foreign key (manager_id) references public.tai_khoan(id) on delete set null,
  constraint tai_khoan_email_key unique (email),
  constraint tai_khoan_so_dien_thoai_key unique (so_dien_thoai),
  constraint tai_khoan_ma_dai_ly_key unique (ma_dai_ly),
  constraint tai_khoan_trang_thai_check
    check (trang_thai in ('CHO_PHE_DUYET', 'DANG_HOAT_DONG', 'KHOA'))
);

create table public.vai_tro (
  id uuid primary key default gen_random_uuid(),
  ma_vai_tro text not null,
  ten_vai_tro text not null,
  mo_ta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vai_tro_ma_vai_tro_key unique (ma_vai_tro),
  constraint vai_tro_ten_vai_tro_key unique (ten_vai_tro)
);

create table public.quyen (
  id uuid primary key default gen_random_uuid(),
  ma_quyen text not null,
  ten_quyen text not null,
  mo_ta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint quyen_ma_quyen_key unique (ma_quyen)
);

create table public.phan_cong_vai_tro (
  id uuid primary key default gen_random_uuid(),
  tai_khoan_id uuid not null,
  vai_tro_id uuid not null,
  nguoi_gan_id uuid,
  thoi_diem_gan timestamptz not null default now(),

  constraint phan_cong_vai_tro_tai_khoan_fk
    foreign key (tai_khoan_id) references public.tai_khoan(id) on delete cascade,
  constraint phan_cong_vai_tro_vai_tro_fk
    foreign key (vai_tro_id) references public.vai_tro(id) on delete cascade,
  constraint phan_cong_vai_tro_nguoi_gan_fk
    foreign key (nguoi_gan_id) references public.tai_khoan(id) on delete set null,
  constraint phan_cong_vai_tro_tai_khoan_vai_tro_key
    unique (tai_khoan_id, vai_tro_id)
);

create table public.phan_quyen_vai_tro (
  id uuid primary key default gen_random_uuid(),
  vai_tro_id uuid not null,
  quyen_id uuid not null,
  nguoi_gan_id uuid,
  thoi_diem_gan timestamptz not null default now(),

  constraint phan_quyen_vai_tro_vai_tro_fk
    foreign key (vai_tro_id) references public.vai_tro(id) on delete cascade,
  constraint phan_quyen_vai_tro_quyen_fk
    foreign key (quyen_id) references public.quyen(id) on delete cascade,
  constraint phan_quyen_vai_tro_nguoi_gan_fk
    foreign key (nguoi_gan_id) references public.tai_khoan(id) on delete set null,
  constraint phan_quyen_vai_tro_vai_tro_quyen_key
    unique (vai_tro_id, quyen_id)
);

create table public.khach_hang (
  id uuid primary key default gen_random_uuid(),
  chu_so_huu_id uuid not null,
  ma_khach_hang text not null,
  ho_ten text not null,
  so_dien_thoai text not null,
  gioi_tinh text not null,
  ngay_sinh date not null,
  dia_chi text not null,
  so_thich text not null,
  ghi_chu text not null,
  loai_khach_hang text not null,
  tinh_trang text not null,
  nhom_tinh_cach text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint khach_hang_chu_so_huu_fk
    foreign key (chu_so_huu_id) references public.tai_khoan(id) on delete restrict,
  constraint khach_hang_ma_khach_hang_key unique (ma_khach_hang),
  constraint khach_hang_so_dien_thoai_key unique (so_dien_thoai),
  constraint khach_hang_loai_check
    check (loai_khach_hang in ('MUC_TIEU', 'NUOI_DUONG', 'DOI_TAC')),
  constraint khach_hang_tinh_trang_check
    check (tinh_trang in ('BẠN', 'BÀN', 'BÁN', 'BÁM')),
  constraint khach_hang_nhom_tinh_cach_check
    check (nhom_tinh_cach in ('D', 'I', 'S', 'C'))
);

create table public.hoat_dong (
  id uuid primary key default gen_random_uuid(),
  tai_khoan_id uuid not null,
  loai_hoat_dong text not null,
  dia_diem text not null,
  thoi_gian timestamptz not null,
  so_khach_hang_ket_noi integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint hoat_dong_tai_khoan_fk
    foreign key (tai_khoan_id) references public.tai_khoan(id) on delete restrict,
  constraint hoat_dong_loai_check
    check (loai_hoat_dong in ('KHẢO_SÁT', 'GẶP_GỠ', 'TƯ_VẤN')),
  constraint hoat_dong_so_khach_hang_ket_noi_check
    check (so_khach_hang_ket_noi >= 0)
);

create table public.thong_bao (
  id uuid primary key default gen_random_uuid(),
  nguoi_tao_id uuid not null,
  tieu_de text not null,
  noi_dung text not null,
  loai text not null,
  trang_thai text not null default 'CHƯA_GỬI',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint thong_bao_nguoi_tao_fk
    foreign key (nguoi_tao_id) references public.tai_khoan(id) on delete restrict,
  constraint thong_bao_loai_check
    check (loai in ('TIN_TỨC', 'TỰ_ĐỘNG_HỆ_THỐNG')),
  constraint thong_bao_trang_thai_check
    check (trang_thai in ('CHƯA_GỬI', 'ĐÃ_GỬI'))
);

create table public.thong_bao_nguoi_nhan (
  id uuid primary key default gen_random_uuid(),
  thong_bao_id uuid not null,
  tai_khoan_id uuid not null,
  da_doc boolean not null default false,

  constraint thong_bao_nguoi_nhan_thong_bao_fk
    foreign key (thong_bao_id) references public.thong_bao(id) on delete cascade,
  constraint thong_bao_nguoi_nhan_tai_khoan_fk
    foreign key (tai_khoan_id) references public.tai_khoan(id) on delete restrict,
  constraint thong_bao_nguoi_nhan_thong_bao_tai_khoan_key
    unique (thong_bao_id, tai_khoan_id)
);

create index idx_tai_khoan_manager_id
  on public.tai_khoan(manager_id);

create index idx_phan_cong_vai_tro_vai_tro_id
  on public.phan_cong_vai_tro(vai_tro_id);

create index idx_phan_quyen_vai_tro_quyen_id
  on public.phan_quyen_vai_tro(quyen_id);

create index idx_khach_hang_chu_so_huu_id
  on public.khach_hang(chu_so_huu_id);

create index idx_hoat_dong_tai_khoan_thoi_gian
  on public.hoat_dong(tai_khoan_id, thoi_gian);

create index idx_thong_bao_nguoi_tao_created_at
  on public.thong_bao(nguoi_tao_id, created_at);

create index idx_thong_bao_trang_thai
  on public.thong_bao(trang_thai);

create index idx_thong_bao_nguoi_nhan_tai_khoan_da_doc
  on public.thong_bao_nguoi_nhan(tai_khoan_id, da_doc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_tai_khoan_updated_at
before update on public.tai_khoan
for each row execute function public.set_updated_at();

create trigger trg_vai_tro_updated_at
before update on public.vai_tro
for each row execute function public.set_updated_at();

create trigger trg_quyen_updated_at
before update on public.quyen
for each row execute function public.set_updated_at();

create trigger trg_khach_hang_updated_at
before update on public.khach_hang
for each row execute function public.set_updated_at();

create trigger trg_hoat_dong_updated_at
before update on public.hoat_dong
for each row execute function public.set_updated_at();

create trigger trg_thong_bao_updated_at
before update on public.thong_bao
for each row execute function public.set_updated_at();
