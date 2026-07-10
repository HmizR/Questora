import { Prisma, QuestType } from "@prisma/client";

import { calculateLevel } from "@/lib/level";

type Tx = Prisma.TransactionClient;

export async function awardXp(params: {
  tx: Tx;
  studentId: string;
  classId?: string;
  amount: number;
  sourceType: string;
  sourceId: string;
  description: string;
  idempotencyKey: string;
}) {
  const existing = await params.tx.xPTransaction.findUnique({
    where: { idempotencyKey: params.idempotencyKey }
  });

  if (existing) {
    return { awarded: false, transaction: existing };
  }

  const transaction = await params.tx.xPTransaction.create({
    data: {
      studentId: params.studentId,
      classId: params.classId,
      amount: params.amount,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      description: params.description,
      idempotencyKey: params.idempotencyKey
    }
  });

  const currentProfile = await params.tx.studentProfile.upsert({
    where: { studentId: params.studentId },
    update: {},
    create: {
      studentId: params.studentId,
      totalXp: 0,
      level: 1
    }
  });

  const totalXp = currentProfile.totalXp + params.amount;
  await params.tx.studentProfile.update({
    where: { studentId: params.studentId },
    data: {
      totalXp,
      level: calculateLevel(totalXp)
    }
  });

  return { awarded: true, transaction };
}

export async function awardBadgeByName(tx: Tx, studentId: string, badgeName: string) {
  const badge = await tx.badge.findUnique({ where: { name: badgeName } });
  if (!badge) {
    return null;
  }

  return tx.studentBadge.upsert({
    where: {
      studentId_badgeId: {
        studentId,
        badgeId: badge.id
      }
    },
    update: {},
    create: {
      studentId,
      badgeId: badge.id
    }
  });
}

export async function awardQuestXp(params: {
  tx: Tx;
  questId: string;
  studentId: string;
}) {
  const quest = await params.tx.quest.findUniqueOrThrow({
    where: { id: params.questId }
  });

  const result = await awardXp({
    tx: params.tx,
    studentId: params.studentId,
    classId: quest.classId,
    amount: quest.xpReward,
    sourceType: "QUEST",
    sourceId: quest.id,
    description: `Completed quest: ${quest.title}`,
    idempotencyKey: `quest:${quest.id}:student:${params.studentId}:completed`
  });

  if (result.awarded) {
    await awardBadgeByName(params.tx, params.studentId, "Quest Beginner");
    if (quest.type === QuestType.BOSS) {
      await awardBadgeByName(params.tx, params.studentId, "Boss Slayer");
    }
  }

  return result;
}
