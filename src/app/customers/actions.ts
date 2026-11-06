"use server";

/**
 * Server Action kiểm tra dữ liệu và tạo/sửa/xóa khách hàng; database quản lý mã khách hàng và
 * quyền thao tác trên bản ghi.
 */

import { redirect } from "next/navigation";

import { requireBusinessAccount } from "@/lib/business";
import { isUuid, isValidDateOnly } from "@/lib/input-validation.mjs";

const customerTypes = new Set(["MUC_TIEU", "NUOI_DUONG", "DOI_TAC"]);
const customerStatuses = new Set(["BẠN", "BÀN", "BÁN", "BÁM"]);
const personalityGroups = new Set(["D", "I", "S", "C"]);

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Chỉ nhận các trường được phép sửa; trả null khi thiếu dữ liệu, ngày sai hoặc giá trị ngoài
 * danh mục.
 */
function customerPayload(formData: FormData) {
  const payload = {
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

  if (Object.values(payload).some((value) => !value) || !isValidDateOnly(payload.ngay_sinh)) {
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

/**
 * Gắn chủ sở hữu từ phiên; trigger sinh mã khách hàng. Chỉ thử lại khi xung đột đúng khóa mã
 * khách hàng.
 */
export async function createCustomer(formData: FormData) {
  const payload = customerPayload(formData);
  if (!payload) {
    redirect("/customers/new?error=invalid");
  }

  const { supabase, accountId } = await requireBusinessAccount();
  let createdCustomerId: string | null = null;

  // The database trigger is the source of truth. Retry only if the database
  // reports a customer-code uniqueness conflict; other validation failures
  // (including duplicate phone numbers) are not transient code conflicts.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase
      .from("khach_hang")
      .insert({ ...payload, chu_so_huu_id: accountId })
      .select("id,ma_khach_hang")
      .single();

    if (!error && data?.id && data.ma_khach_hang) {
      createdCustomerId = data.id;
      break;
    }

    const isCustomerCodeConflict =
      error?.code === "23505" &&
      `${error.message} ${error.details ?? ""}`.includes("khach_hang_ma_khach_hang_key");
    if (!isCustomerCodeConflict) break;
  }

  if (!createdCustomerId) {
    redirect("/customers/new?error=create");
  }

  // The detail page reads the committed record and displays its generated code.
  redirect("/customers/" + encodeURIComponent(createdCustomerId) + "?status=created");
}

/**
 * Cập nhật theo UUID; select lại id để phân biệt cập nhật thành công với trường hợp RLS không
 * cho sửa dòng nào.
 */
export async function updateCustomer(formData: FormData) {
  const customerId = field(formData, "customer_id");
  const payload = customerPayload(formData);
  if (!isUuid(customerId)) {
    redirect("/customers?error=invalid");
  }
  if (!payload) {
    redirect("/customers/" + encodeURIComponent(customerId) + "/edit?error=invalid");
  }

  const { supabase } = await requireBusinessAccount();
  const { data, error } = await supabase
    .from("khach_hang")
    .update(payload)
    .eq("id", customerId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/customers/" + encodeURIComponent(customerId) + "/edit?error=update");
  }

  redirect("/customers/" + encodeURIComponent(customerId) + "?status=updated");
}

/**
 * Xóa theo UUID dưới quyền người gọi; chỉ báo thành công khi database trả lại id đã xóa.
 */
export async function deleteCustomer(formData: FormData) {
  const customerId = field(formData, "customer_id");
  if (!isUuid(customerId)) {
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
    redirect("/customers/" + encodeURIComponent(customerId) + "?error=delete");
  }

  redirect("/customers?status=deleted");
}
