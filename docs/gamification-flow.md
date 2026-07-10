# Gamification Flow

## Activity Completion

1. Load the activity, module, class, and prerequisites.
2. Verify the student is actively enrolled in the class.
3. Verify the module and activity are published.
4. Verify availability and prerequisite completion rules.
5. Update `ActivityProgress` on the server.
6. Check all published quests connected to the activity.
7. If a quest is now complete, create an XP transaction and update the student profile in the same database transaction.
8. Award badges when conditions are met.

Lessons and MVP quiz attempts can complete immediately. Assignments and boss battle projects become complete after lecturer grading, and grading runs the same quest/XP/badge transaction path.

## Quest Completion

Quest completion is derived from required connected activity progress. Optional activities do not block quest completion. Students never submit a direct "quest complete" request.

## XP and Level

XP changes must create an `XPTransaction`. The profile is updated in the same transaction using:

```text
level = floor(sqrt(totalXp / 100)) + 1
```

Idempotency keys prevent duplicate rewards, for example:

```text
quest:{questId}:student:{studentId}:completed
```

The student interface may display quest progress, XP, badges, and level progress, but it never submits XP amounts or direct quest-complete requests.
