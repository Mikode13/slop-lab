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

## Evolve towards domain, application, infrastructure, and UI boundaries

**Decision.** The teaching sequence will evolve the application towards four explicit
boundaries: domain, application, infrastructure, and UI. UI will invoke application use
cases, application will coordinate domain concepts through project-owned ports, and
infrastructure will implement those ports for external providers. A small composition root
will connect concrete adapters to the application.

**Context.** The starting implementation deliberately combines rendering, use-case
orchestration, HTTP requests, remote response types, and presentation mapping inside React
components. The repository needs an architectural direction against which focused refactors
can be reviewed without pretending that the direction already exists.

Direct communication between domain and React would make the domain depend on a delivery
mechanism. The application boundary instead gives UI a way to obtain domain results while
keeping React, Axios, and provider details outside the domain.

**Consequences.** Each boundary is introduced only when a dedicated pull request can show
the problem it solves. Infrastructure depends on application-owned ports rather than owning
the use-case contracts. Domain remains independent of React and Axios. Until the relevant
refactors land, the architecture document identifies the flat design and its coupling as
current, intentional teaching material rather than describing the target as complete.

**Lesson.** An architectural direction can guide incremental work without falsifying the
current state, provided that current and intended structures remain explicit.

## Pilot automated review locally before centralizing it

**Decision.** slop-lab will temporarily own the first executable AI review workflow. After
controlled pull requests prove its outcome contract and failure behavior, the implementation
will move to `Mikode13/.github` and this repository will retain only an immutable thin
caller.

**Context.** The active MiKode policy calls for a central reusable reviewer followed by
consumer pilots. No executable reviewer exists yet, so that sequence would make the first
central implementation depend on untested assumptions about provider execution, structured
output, and GitHub publication. slop-lab already exists as the public integration canary and
contains known defects that test whether review can distinguish pre-existing debt from a
problem introduced by a pull request.

**Consequences.** The local workflow is an explicit, temporary deviation from the normal
central-workflow boundary. Deterministic `CI / required` remains untouched. The provider
credential stays in a read-only analysis job and publication happens separately, with the
publishing job re-deriving the whole result contract before it acts on what analysis handed
it. A result that cannot be validated, is bound to another commit, or never arrived is
`incomplete` and fails the check; a completed review that found a blocking problem passes the
check and blocks the merge through unresolved conversations instead. Promotion must preserve
that behavior, add the reusable contract and fixtures the central repository requires, and
delete the local implementation rather than let two reviewers drift.

**Lesson.** A central workflow is cheaper to trust when its provider and publication
boundaries have first been exercised by the canary that will consume it.

## Give the automated reviewer evidence instead of a workspace

**Decision.** The workflow collects the diff, the reviewed files, the intent sources, the
trusted base context, and the applicable standards, and sends them to the reviewer as one
prompt. The reviewer reads no repository, runs no command, and explores nothing.

**Context.** The pilot runs the review through `harness-cli`, which leaves a non-interactive
run with nobody to approve a tool permission and caps a Claude turn at three turns. A reviewer
that tried to explore would stall on its first permission request until the deadline, and a
stalled run is indistinguishable from a thorough one until it fails. Collecting the evidence in
the job also keeps the reviewer's inputs read from a trusted revision rather than from the
branch under review.

**Consequences.** Evidence has a size, so the prompt has a budget. Sections are added whole in
priority order and never truncated, and whatever does not fit is declared to the reviewer and
republished in the summary, so missing context reduces coverage instead of quietly producing a
clean review. When the trusted instructions or the reviewed files are what got displaced, the
run is abandoned as `incomplete` before the provider is called, because paying for a review of
a diff with no surrounding code buys nothing.

The first budget was set by the transport rather than the model. `harness-cli` 1.0.1 took the
prompt as a single command argument, which Linux caps at 128 KiB, and the eight-file bootstrap
in pull request 2 needed about 250 KiB: it would have displaced the reviewed files, all three
specialist guides, the architecture document, the decision log, and two standards. Instead of
shrinking the evidence to fit, `harness-cli` 1.1.0 added `--prompt-file`
([harness-cli#7](https://github.com/Mikode13/harness-cli/issues/7)) and the pilot adopted it
before merging. The budget is now 1,250,000 bytes, about 500,000 tokens: half of Opus 5's
1M-token window, below the length at which a long context degrades the review, and enough for
the bootstrap to fit whole.

**Lesson.** Measure the transport before planning around it. The argument limit was expected to
matter for unusually large pull requests; it turned out to bind on the smallest real one and to
exclude an ordinary one. Removing it where it lived took one small release, while designing
around it would have shaped every later review.

## Fail the review gate instead of skipping it

**Decision.** `AI Review / required` fails for every pull request that could merge without a
review: when the base revision carries no reviewer, when the pull request comes from a fork,
and when analysis did not succeed. Only a draft gets no result. The review is required only
through a ruleset of its own.

**Context.** GitHub reports a job skipped by its condition as successful, and a skipped
required check does not block a merge. The first version of the workflow skipped fork pull
requests on the assumption that the check would then never report; it would have reported
success instead. The bootstrap pull request raised the opposite question, whether a check
that cannot run yet should skip rather than fail.

**Consequences.** The bootstrap pull request merges without a review, because its base
carries no reviewer, and the review becomes required only afterwards, in a ruleset of its own,
because the shared `required-ci` ruleset would make every other repository wait for a review
that never comes. Removing the reviewer from `main` fails later reviews instead of silently
passing them. An exceptional merge past an
`incomplete` review goes through a pull-request-only bypass, which the standard allows with a
recorded reason, instead of an edit to the ruleset.

**Lesson.** On a required check, skipped means passed. A condition that skips a gate opens it,
so every path that cannot produce a review has to fail.

## Put the token and the check out of a branch's reach before the gate is required

**Decision.** The review runs through `pull_request_target`, from `main`, and the provider
token lives in an `ai-review` environment that only a run from `main` can read. The check stays
unrequired until promotion, when a ruleset requires the central workflow at a pinned commit.
No GitHub App is created for the pilot. Until promotion the pilot runs only on branches pushed
by trusted maintainers and their agents, with the remaining risk accepted explicitly on the
bootstrap pull request.

**Context.** Under `pull_request`, GitHub runs every workflow as the pull request branch
defines it, including workflows the branch adds, and gives a branch of the same repository its
secrets. Reading the reviewer's scripts from the base revision protects the reviewer, not the
token, which any branch workflow could read, and not the check, which any branch workflow can
report under the same name. Branches here are pushed by implementing agents as well as by the
maintainer.

**Consequences.** The token is out of a branch's reach from the start. The check is not until
promotion: a ruleset cannot require a workflow in the repository that holds it, a push ruleset
that blocked workflow changes is available only to private and internal repositories, and a
GitHub App would have to be removed again once the central workflow is required. The pilot
therefore measures the review with its status reported but not required.

**Lesson.** Trusting the code a workflow runs is not the same as trusting the workflow, and
trusting the workflow is not the same as trusting every workflow a branch can add. The boundary
has to include the secret and the name of the check, and the cheapest way to close each part
can differ.

## Test entry that conflicts with main

This pull request only tests how the review stops on a conflict.
