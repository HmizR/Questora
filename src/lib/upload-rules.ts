export type UploadIntent = "AVATAR" | "SUBMISSION" | "MISSION_RESOURCE";

export type UploadRule = {
  maxBytes: number;
  contentTypes: string[];
};

const officeTypes = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

const documentTypes = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  ...officeTypes
];

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const uploadRules: Record<UploadIntent, UploadRule> = {
  AVATAR: {
    maxBytes: 2 * 1024 * 1024,
    contentTypes: imageTypes
  },
  SUBMISSION: {
    maxBytes: 25 * 1024 * 1024,
    contentTypes: [...imageTypes, ...documentTypes]
  },
  MISSION_RESOURCE: {
    maxBytes: 50 * 1024 * 1024,
    contentTypes: [...imageTypes, ...documentTypes]
  }
};

export function isAllowedUploadType(intent: UploadIntent, contentType: string) {
  return uploadRules[intent].contentTypes.includes(contentType);
}

export function isAllowedUploadSize(intent: UploadIntent, size: number) {
  return size > 0 && size <= uploadRules[intent].maxBytes;
}

export function isProtectedStorageRef(value: string | null | undefined) {
  return Boolean(value?.startsWith("s3:"));
}

export function formatMaxUploadSize(intent: UploadIntent) {
  const maxBytes = uploadRules[intent].maxBytes;
  const megabytes = maxBytes / (1024 * 1024);

  return `${megabytes} MB`;
}
