import { redirect } from "next/navigation";

export default async function LecturerSubmissionsPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  redirect(`/lecturer/classes/${classId}/grades`);
}
