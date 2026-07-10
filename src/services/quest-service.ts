import { ProgressStatus, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function isQuestCompleteForStudent(tx: Tx, questId: string, studentId: string) {
  const quest = await tx.quest.findUnique({
    where: { id: questId },
    include: {
      activities: {
        where: {
          activity: {
            isRequired: true
          }
        },
        include: {
          activity: {
            include: {
              progresses: {
                where: { studentId }
              }
            }
          }
        }
      }
    }
  });

  if (!quest || !quest.isPublished || quest.activities.length === 0) {
    return false;
  }

  return quest.activities.every((link) =>
    link.activity.progresses.some((progress) => progress.status === ProgressStatus.COMPLETED)
  );
}
