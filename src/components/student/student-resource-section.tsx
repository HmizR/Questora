"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { ActivityResourceKind } from "@prisma/client";

import {
  ResourcePreviewPanel,
  type PreviewResource
} from "@/components/student/resource-preview-panel";
import { ResourceFileCard } from "@/components/ui/resource-file-card";

type StudentResource = PreviewResource & {
  createdAt: Date | null;
  description: string | null;
  position: number;
};

export function StudentResourceSection({
  activityId,
  resources
}: {
  activityId: string;
  resources: Array<{
    id: string;
    title: string;
    fileName: string;
    fileUrl: string;
    contentType: string | null;
    size: number | null;
    isRequired: boolean;
    kind: ActivityResourceKind;
    createdAt: Date | null;
    description: string | null;
    position: number;
  }>;
}) {
  const [selectedResource, setSelectedResource] = useState<StudentResource | null>(null);
  const requiredResources = resources.filter((resource) => resource.isRequired);
  const optionalResources = resources.filter((resource) => !resource.isRequired);

  function renderResourceGroup(title: string, groupResources: StudentResource[]) {
    if (groupResources.length === 0) {
      return null;
    }

    return (
      <div>
        <h3 className="text-sm font-bold text-ink/75">{title}</h3>
        <div className="mt-3 grid gap-3">
          {groupResources.map((resource) => {
            return (
              <ResourceFileCard
                activityId={activityId}
                contentType={resource.contentType}
                createdAt={resource.createdAt}
                description={resource.description}
                fileName={resource.fileName}
                fileUrl={resource.fileUrl}
                intent="MISSION_RESOURCE"
                isRequired={resource.isRequired}
                key={resource.id}
                kind={resource.kind}
                position={resource.position}
                previewSlot={
                  <button
                    aria-label={`Preview ${resource.title}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-moss hover:underline"
                    onClick={() => setSelectedResource(resource)}
                    title={`Preview ${resource.title}`}
                    type="button"
                  >
                    <Eye aria-hidden className="h-4 w-4" />
                    Preview
                  </button>
                }
                size={resource.size}
                title={resource.title}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (resources.length === 0) {
    return null;
  }

  return (
    <>
      {selectedResource ? (
        <ResourcePreviewPanel
          activityId={activityId}
          onClose={() => setSelectedResource(null)}
          resource={selectedResource}
        />
      ) : null}
      <section className="mt-5 rounded-lg border border-ink/10 bg-surface-muted p-5">
        <h2 className="font-bold">Resources</h2>
        <div className="mt-3 space-y-5">
          {renderResourceGroup("Required resources", requiredResources)}
          {renderResourceGroup("Optional resources", optionalResources)}
        </div>
      </section>
    </>
  );
}
