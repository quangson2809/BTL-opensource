import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  accountStatusLabels,
  toNotificationRecipientOptions,
} from "../src/lib/notification-recipient-options.mjs";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

const accounts = [
  {
    id: "account-1",
    ho_ten: "Nguyễn An",
    ma_dai_ly: "DL001",
    trang_thai: "DANG_HOAT_DONG",
  },
  {
    id: "account-2",
    ho_ten: "Trần Bình",
    ma_dai_ly: "DL002",
    trang_thai: "CHO_PHE_DUYET",
  },
  {
    id: "account-3",
    ho_ten: "Lê Chi",
    ma_dai_ly: "DL003",
    trang_thai: "STATUS_UNKNOWN",
  },
];

test("shared account status labels cover known states and safely label unknown states", () => {
  assert.equal(accountStatusLabels.CHO_PHE_DUYET, "Chờ phê duyệt");
  assert.equal(accountStatusLabels.DANG_HOAT_DONG, "Đang hoạt động");
  assert.equal(accountStatusLabels.KHOA, "Đã khóa");
  assert.equal(Object.isFrozen(accountStatusLabels), true);
  assert.match(toNotificationRecipientOptions([accounts[2]])[0].detail, /Chưa xác định trạng thái/);
});

test("shared recipient mapping preserves ids, labels, search fields, grouping, and input order", () => {
  assert.deepEqual(toNotificationRecipientOptions(accounts), [
    {
      id: "account-1",
      label: "Nguyễn An",
      detail: "DL001 · Đang hoạt động",
      searchText: "Nguyễn An DL001 DANG_HOAT_DONG",
      group: "Người nhận trong phạm vi",
    },
    {
      id: "account-2",
      label: "Trần Bình",
      detail: "DL002 · Chờ phê duyệt",
      searchText: "Trần Bình DL002 CHO_PHE_DUYET",
      group: "Người nhận trong phạm vi",
    },
    {
      id: "account-3",
      label: "Lê Chi",
      detail: "DL003 · Chưa xác định trạng thái",
      searchText: "Lê Chi DL003 STATUS_UNKNOWN",
      group: "Người nhận trong phạm vi",
    },
  ]);
  assert.deepEqual(toNotificationRecipientOptions(null), []);
  assert.deepEqual(toNotificationRecipientOptions(undefined), []);
});

test("create and edit reuse recipient mapping while retaining page-specific safeguards", async () => {
  const [create, edit, actions, picker] = await Promise.all([
    readSource("../src/app/notifications/new/page.tsx"),
    readSource("../src/app/notifications/[id]/edit/page.tsx"),
    readSource("../src/app/notifications/actions.ts"),
    readSource("../src/components/searchable-checkbox-picker.tsx"),
  ]);

  assert.match(create, /toNotificationRecipientOptions\(recipients\)/);
  assert.match(edit, /toNotificationRecipientOptions\(accountsResult\.data\)/);
  assert.match(create, /\.neq\("id", accountId\)/);
  assert.match(edit, /\.neq\("id", accountId\)/);
  assert.match(edit, /notification\.nguoi_tao_id !== accountId/);
  assert.match(edit, /notification\.trang_thai !== "CHƯA_GỬI"/);
  assert.match(edit, /selectedIds=\{selectedRecipients\}/);
  assert.match(edit, /unavailableSelectedRecipientCount > 0/);
  assert.match(edit, /disabled=\{unavailableSelectedRecipientCount > 0\}/);

  assert.match(picker, /setQuery\(event\.target\.value\)/);
  assert.match(picker, /checked=\{selectedSet\.has\(option\.id\)\}/);
  assert.match(picker, /hidden=\{!visible\}/);
  assert.match(picker, /Bỏ chọn/);
  assert.match(picker, /idaily:form-draft-restored/);
  assert.match(picker, /validateRequiredSelection/);

  assert.match(actions, /dm_create_notification/);
  assert.match(actions, /dm_update_notification_draft/);
  assert.match(actions, /recipients\.some\(\(recipient\) => !isUuid\(recipient\)\)/);
  assert.match(actions, /\[\.\.\.new Set\(recipients\)\]/);
});
