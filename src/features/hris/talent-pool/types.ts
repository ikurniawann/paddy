import type { Candidate, Brand } from "@/types";

export type TalentPoolCandidate = Candidate & {
  brands?: { name: string };
  positions?: { title: string };
};

export type { Brand };

export interface SendCandidateNotificationPayload {
  candidate_id: string;
  channel: string;
  message: string;
}
