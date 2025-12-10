const SUPPORTED_TAGS = ["Fantasy", "Adventure", "Action"];

const SUPPORTED_STATUSES = [
  "ongoing",
  "completed",
  "hiatus",
  "cancelled",
  "unknown",
];

const SUPPORTED_STATUSES_COLOR = {
  ongoing: "text-green-500",
  completed: "text-blue-500",
  hiatus: "text-yellow-500",
  cancelled: "text-red-500",
  unknown: "",
};

type Status = (typeof SUPPORTED_STATUSES)[number];

export { SUPPORTED_TAGS, SUPPORTED_STATUSES, SUPPORTED_STATUSES_COLOR, Status };
