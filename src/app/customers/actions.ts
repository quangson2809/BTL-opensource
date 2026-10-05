"use server";

import { redirect } from "next/navigation";

import { requireBusinessAccount } from "@/lib/business";

const customerTypes = new Set(["MUC_TIEU", "NUOI_DUONG", "DOI_TAC"]);
const customerStatuses = new Set(["BẠN", "BÀN", "BÁN", "BÁM"]);
const personalityGroups = new Set(["D", "I", "S", "C"]);

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function customerPayload(formData: FormData) {
  const payload = {
    ma_khach_hang: field(formData, "ma_khach_hang"),
    ho_ten: field(formData, "ho_ten"),
    so_dien_thoai: field(formData, "so_dien_thoai"),
    gioi_tinh: field(formData, "gioi_tinh"),
    ngay_sinh: field(formData, "ngay_sinh"),
    dia_chi: field(formData, "dia_chi"),
    so_thich: field(formData, "so_thich"),
    ghi_chu: field(formData, "ghi_chu"),
    loai_khach_hang: field(formData, "loai_khach_hang"),
    tinh_trang: field(formData, "tinh_trang"),
    nhom_tinh_cach: field(formData, "nhom_tinh_cach"),
  };

  if (Object.values(payload).some((value) => !value)) {
    return null;
  }

  if (
    !customerTypes.has(payload.loai_khach_hang) ||
    !customerStatuses.has(payload.tinh_trang) ||
    !personalityGroups.has(payload.nhom_tinh_cach)
  ) {
    return null;
  }

  return payload;
}

export async function createCustomer(formData: FormData) {
  const payload = customerPayload(formData);
  if (!payload) {
    redirect("/customers/new?error=invalid");
  }

  const { supabase, accountId } = await requireBusinessAccount();
  const { data, error } = await supabase
    .from("khach_hang")
    .insert({ ...payload, chu_so_huu_id: accountId })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/customers/new?error=create");
  }

  redirect(\`/customers/\${data.id}?status=created\`);
}

export async function updateCustomer(formData: FormData) {
  const customerId = field(formData, "customer_id");
  const payload = customerPayload(formData);
  if (!customerId || !payload) {
    redirect(\`/customers/\${customerId || "unknown"}/edit?error=invalid\`);
  }

  const { supabase } = await requireBusinessAccount();
  const { data, error } = await supabase
    .from("khach_hang")
    .update(payload)
    .eq("id", customerId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(\`/customers/\${customerId}/edit?error=update\`);
  }

  redirect(\`/customers/\${customerId}?status=updated\`);
}

export async function deleteCustomer(formData: FormData) {
  const customerId = field(formData, "customer_id");
  if (!customerId) {
    redirect("/customers?error=delete");
  }

  const { supabase } = await requireBusinessAccount();
  const { data, error } = await supabase
    .from("khach_hang")
    .delete()
    .eq("id", customerId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(\`/customers/\${customerId}?error=delete\`);
  }

  redirect("/customers?status=deleted");
}
