import { resolveActionFeedback } from "@/lib/interaction-contracts.mjs";

type ActionFeedbackProps = {
  error?: string;
  status?: string;
};

export function ActionFeedback({ error, status }: ActionFeedbackProps) {
  const feedback = resolveActionFeedback({ error, status });
  if (!feedback) return null;

  const isError = feedback.kind === "error";

  return (
    <p
      aria-live={isError ? "assertive" : "polite"}
      className={isError ? "message error" : "message success"}
      role={isError ? "alert" : "status"}
    >
      {feedback.message}
    </p>
  );
}
