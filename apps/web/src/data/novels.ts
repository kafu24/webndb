const SUPPORTED_TAGS = ["Fantasy", "Adventure", "Action"];

const SUPPORTED_STATUSES = ["Ongoing", "Completed", "Hiatus", "Cancelled"];

const SUPPORTED_STATUSES_COLOR = {
  Ongoing: "text-green-500",
  Completed: "text-blue-500",
  Hiatus: "text-yellow-500",
  Cancelled: "text-red-500",
};

type Status = (typeof SUPPORTED_STATUSES)[number];

export { SUPPORTED_TAGS, SUPPORTED_STATUSES, SUPPORTED_STATUSES_COLOR, Status };
