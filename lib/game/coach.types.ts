// Types for the AI replay coach (TASK-DD-AI-002). The same shape a later
// LLM-backed coach would return.

export interface CoachTip {
  title: string;
  detail: string;
  evidence: string; // always grounded in something the run actually did
}
