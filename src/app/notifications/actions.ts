"use server";

import { redirect } from "next/navigation";

import { requireBusinessAccount, requireDm } from "@/lib/business";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createNotification(formData: FormData) {
  const title = field(formData, "tieu_de");
  const content = field(formData, "noi_dung");
  const type = field(formData, "loai");
  const recipients = formData
    .getAll("recipient_ids")
    .filter(
      (value): value is string =>
        typeof value === "string" && value.length > 0,
    );

  if (
    !title ||
    !content ||
    !recipients.length ||
    !["TIN_TỨC", "TỰ_ĐỘNG_HỆ_THỐNG"].includes(type)
  ) {
    redirect("/notifications/new?error=invalid");
  }

  const { supabase } = await requireDm();
  const { data, error } = await supabase.rpc("dm_create_notification", {
    notification_title: title,
    notification_content: content,
    notification_type: type,
    recipient_ids: recipients,
  });

  if (error || !data) {
    redirect("/notifications/new?error=create");
  }

  redirect(\`/notifications?status=created&id=\${data}\`);
}

export async function sendNotification(formData: FormData) {
  const notificationId = field(formData, "notification_id");
  if (!notificationId) {
    redirect("/notifications?error=send");
  }

  const { supabase } = await requireDm();
  const { error } = await supabase.rpc("dm_send_notification", {
    target_notification_id: notificationId,
  });

  if (error) {
    redirect("/notifications?error=send");
  }

  redirect("/notifications?status=sent");
}

export async function markNotificationRead(formData: FormData) {
  const recipientRowId = field(formData, "recipient_row_id");
  if (!recipientRowId) {
    redirect("/notifications?error=read");
  }

  const { supabase, accountId } = await requireBusinessAccount();
  const { data, error } = await supabase
    .from("thong_bao_nguoi_nhan")
    .update({ da_doc: true })
    .eq("id", recipientRowId)
    .eq("tai_khoan_id", accountId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/notifications?error=read");
  }

  redirect("/notifications?status=read");
}
