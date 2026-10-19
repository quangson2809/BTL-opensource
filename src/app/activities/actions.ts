"use server";

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

function activityPayload(formData: FormData) {
  const loaiHoatDong = field(formData, "loai_hoat_dong");
  const diaDiem = field(formData, "dia_diem");
  const thoiGian = field(formData, "thoi_gian");
  const connected = parseNonNegativeInt32(field(formData, "so_khach_hang_ket_noi"));
  const parsedTime = parseVietnamLocalDateTime(thoiGian);

  if (
    !activityTypes.has(loaiHoatDong) ||
    !diaDiem ||
    !parsedTime ||
    connected === null
  ) {
    return null;
  }

  return {
    loai_hoat_dong: loaiHoatDong,
    dia_diem: diaDiem,
    thoi_gian: parsedTime,
    so_khach_hang_ket_noi: connected,
  };
}

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
