"use server";

/**
 * Server Action kiểm tra dữ liệu hoạt động, chuẩn hóa thời gian và tạo/sửa/xóa với tài khoản lấy
 * từ phiên đăng nhập.
 */

import { redirect } from "next/navigation";

import { requireBusinessAccount } from "@/lib/business";
import {
  isUuid,
  parseNonNegativeInt32,
  parseVietnamLocalDateTime,
} from "@/lib/input-validation.mjs";

const activityTypes = new Set(["KHẢO_SÁT", "GẶP_GỠ", "TƯ_VẤN"]);

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Kiểm tra loại/địa điểm/số khách và đổi giờ Việt Nam từ form thành ISO UTC trước khi ghi
 * database.
 */
function activityPayload(formData: FormData) {
  const loaiHoatDong = field(formData, "loai_hoat_dong");
  const diaDiem = field(formData, "dia_diem");
  const thoiGian = field(formData, "thoi_gian");
  const connected = parseNonNegativeInt32(field(formData, "so_khach_hang_ket_noi"));
  const parsedTime = parseVietnamLocalDateTime(thoiGian);

  if (!activityTypes.has(loaiHoatDong) || !diaDiem || !parsedTime || connected === null) {
    return null;
  }

  return {
    loai_hoat_dong: loaiHoatDong,
    dia_diem: diaDiem,
    thoi_gian: parsedTime,
    so_khach_hang_ket_noi: connected,
  };
}

/**
 * Lấy người thực hiện từ phiên đăng nhập để form không thể tạo hoạt động thay cho tài khoản
 * khác.
 */
export async function createActivity(formData: FormData) {
  const payload = activityPayload(formData);
  if (!payload) {
    redirect("/activities/new?error=invalid");
  }

  const { supabase, accountId } = await requireBusinessAccount();
  const { error } = await supabase.from("hoat_dong").insert({
    ...payload,
    tai_khoan_id: accountId,
  });

  if (error) {
    redirect("/activities/new?error=create");
  }

  redirect("/activities?status=created");
}

/**
 * Cần khớp cả id hoạt động và id người đang đăng nhập; quyền xem hoạt động cấp dưới không đồng
 * nghĩa quyền sửa.
 */
export async function updateActivity(formData: FormData) {
  const activityId = field(formData, "activity_id");
  const payload = activityPayload(formData);
  if (!isUuid(activityId)) {
    redirect("/activities?error=invalid");
  }
  if (!payload) {
    redirect("/activities/" + encodeURIComponent(activityId) + "/edit?error=invalid");
  }

  const { supabase, accountId } = await requireBusinessAccount();
  const { data, error } = await supabase
    .from("hoat_dong")
    .update(payload)
    .eq("id", activityId)
    .eq("tai_khoan_id", accountId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/activities/" + encodeURIComponent(activityId) + "/edit?error=update");
  }

  redirect("/activities?status=updated&id=" + encodeURIComponent(activityId));
}

/**
 * Chỉ xóa hoạt động của chính người gọi; kiểm tra id trả về để tránh báo thành công khi không có
 * dòng bị xóa.
 */
export async function deleteActivity(formData: FormData) {
  const activityId = field(formData, "activity_id");
  if (!isUuid(activityId)) {
    redirect("/activities?error=delete");
  }

  const { supabase, accountId } = await requireBusinessAccount();
  const { data, error } = await supabase
    .from("hoat_dong")
    .delete()
    .eq("id", activityId)
    .eq("tai_khoan_id", accountId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/activities?error=delete");
  }

  redirect("/activities?status=deleted");
}
