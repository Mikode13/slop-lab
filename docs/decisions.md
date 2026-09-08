# Project decisions

A chronological log of the significant decisions taken in this repository. Cross-project
rules live in [Mikode13/engineering](https://github.com/Mikode13/engineering); this file
records only what is specific to slop-lab.

## Start from deliberately low-quality application code

**Decision.** The first version of `src/` is written the way an unconstrained code
generator writes it, and the repository improves through one pull request per problem
instead of arriving finished.

**Context.** The MiKode standards and shared packages were written before any consumer
outside MiKode existed. A demonstration that starts from a clean design proves nothing,
because the reader never sees the cost the design avoids. Starting from generated code
makes each later change a comparison against something concrete.

**Consequences.** The application in `src/` is knowingly wrong in ways this repository will
not silently repair: HTTP calls live in components, response types are asserted rather than
validated, request logic is duplicated per call site, requests are never cancelled, and
error states are absent. Anyone reading a single commit must read `README.md` first to
understand that the code is the exhibit, not the recommendation.

The scaffold is exempt from this. Formatting, linting, type checking, licensing, CI, and
documentation follow the active standards from the first commit, so `pnpm run check` passes
over code that is nevertheless badly designed. That gap is itself the first lesson: the
shared quality gate catches syntax, types, and style, and catches none of the architecture.

## Initialize without the testing standard

**Decision.** The repository ships no test suite, no `test` script, and no Tests capability
in CI. The [testing standard](https://github.com/Mikode13/engineering/blob/main/standards/testing.md)
is adopted in a dedicated later pull request.

**Context.** The standard applies to this repository: it contains executable logic. It also
prohibits placeholder commands that always succeed, and the git workflow standard's
`pre-push` template runs `pnpm test`. A repository whose starting code has no tests cannot
satisfy both without lying about one of them.

**Alternatives considered.** Adding Vitest with `passWithNoTests` would keep the required
script interface and produce a green gate that verifies nothing, which the testing standard
prohibits by name. Writing tests at initialization would remove the untested starting point
the project exists to demonstrate.

**Consequences.** Two deviations are open until the testing pull request closes them. The
`test` and `check`-adjacent script interface required by the git workflow standard is
incomplete, and `.husky/pre-push` runs `pnpm run check` alone instead of the shared template's
`pnpm run check && pnpm test`. Both are recorded in `README.md` under current status, and
neither is hidden behind a command that always succeeds.

**Lesson.** A standard that forbids placeholders converts "we have no tests" from an
invisible property of the repository into a decision somebody has to write down.
