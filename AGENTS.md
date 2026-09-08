# Agent instructions for slop-lab

## What this repository is

A React demo application used as teaching material. The code in `src/` is intentionally
low quality, and the project improves through small, individually reviewable pull
requests. [README.md](README.md) explains the format; [docs/decisions.md](docs/decisions.md)
records what each change bought us.

## The rule that matters most

Do not opportunistically fix `src/`. The known problems are the material: HTTP calls in
components, unvalidated response types, duplicated request logic, missing cancellation,
missing loading and error states, and no tests. Each is scheduled for its own pull request
so that its cost and its fix stay visible in the history.

When a task names one of those problems, fix that one and leave the rest. When you notice a
new problem outside the current task, report it instead of repairing it.

## What must stay correct

The repository scaffold already follows the MiKode standards, and `pnpm run check` must pass
on every commit. Bad architecture is in scope; broken formatting, lint errors, and type
errors are not.

## Working agreements

- Branches are `<type>/<description>`; pull request titles are Conventional Commits.
- Every pull request that changes application behavior adds an entry to
  `docs/decisions.md` stating the decision, its context, its consequences, and the lesson.
- Standards live in [Mikode13/engineering](https://github.com/Mikode13/engineering). Do not
  restate their rules here; link to them.
