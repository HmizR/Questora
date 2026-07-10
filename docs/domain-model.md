# Domain Model

Questora keeps the backend model academic and professional while the UI can use RPG terms.

| Backend entity | UI term |
| --- | --- |
| Class | Learning Realm |
| Module | Region |
| Activity | Mission |
| Project activity | Boss Battle |
| Quest | Quest |
| XPTransaction | Experience reward history |

Core relationships:

- A `User` has one primary role.
- A `Class` has one lecturer and many enrolled students through `ClassStudent`.
- A `Module` belongs to a class and has ordered activities.
- An `Activity` can require other activities through `ActivityPrerequisite`.
- `ActivityProgress` is unique per student and activity.
- `Submission` and `Grade` are unique per student and activity for the MVP.
- A `Quest` belongs to a class and contains activities through `QuestActivity`.
- `StudentProfile` stores XP totals and level, but every XP change must originate from `XPTransaction`.
- `StudentBadge` records awarded badges without duplicating the badge definitions.
