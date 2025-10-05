export const supportedStatuses = [
  "Completed",
  "Ongoing",
  "Cancelled",
  "Paused",
] as const;

export type Status = (typeof supportedStatuses)[number];
