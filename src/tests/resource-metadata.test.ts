import { ActivityResourceKind } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createActivityResourceSchema,
  updateActivityResourceSchema
} from "@/schemas/lecturer";

describe("resource metadata validation", () => {
  it("accepts supported resource metadata", () => {
    const parsed = createActivityResourceSchema.safeParse({
      classId: "class-1",
      moduleId: "module-1",
      activityId: "activity-1",
      title: "Starter Pack",
      description: "Use this before starting the mission.",
      kind: ActivityResourceKind.STARTER_FILE,
      isRequired: "on",
      fileName: "starter.zip",
      fileUrl: "s3:mission-resources/activity-1/starter.zip",
      contentType: "application/zip",
      size: "1200",
      position: "1"
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        kind: ActivityResourceKind.STARTER_FILE,
        isRequired: true,
        position: 1
      });
    }
  });

  it("rejects unsupported resource kinds", () => {
    expect(
      updateActivityResourceSchema.safeParse({
        classId: "class-1",
        moduleId: "module-1",
        activityId: "activity-1",
        resourceId: "resource-1",
        title: "Starter Pack",
        kind: "FOLDER",
        position: "1"
      }).success
    ).toBe(false);
  });
});
