/**
 * Khai báo kiểu TypeScript cho interaction-contracts.mjs; mô tả đầu vào/kết quả của module
 * JavaScript và cần đồng bộ khi thay đổi API của module đó.
 */

export type ActionFeedbackResult =
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

export function resolveActionFeedback(input?: {
  error?: string;
  status?: string;
}): ActionFeedbackResult | null;

export function getSubmitPresentation<T>(
  pending: boolean,
  pendingLabel: string,
  defaultLabel: T,
): { disabled: boolean; label: string | T };

export function shouldCancelSubmission(
  confirmMessage: string | undefined,
  confirm: (message: string) => boolean,
): boolean;
