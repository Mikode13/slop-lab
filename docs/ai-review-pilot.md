# AI review pilot

slop-lab temporarily owns an executable AI review workflow so that the review contract can be
tested on real pull requests before it becomes a reusable workflow in `Mikode13/.github`. This
is a bounded pilot, not a project-specific replacement for the central workflow that the
[automated pull request review standard](https://github.com/Mikode13/engineering/blob/main/standards/automated-pull-request-review.md)
requires.

## Frozen configuration

A pilot that changes while it is measured proves nothing, so these are fixed for its duration
and recorded in [the workflow](../.github/workflows/ai-review.yml):

| Choice           | Value                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Reviewer command | `@mikode13/harness-cli@1.1.0`, with the prompt passed through `--prompt-file`                 |
| Review skill     | `mikode-review` from `Mikode13/skills` at `6015886`, the `v0.3.0` tag                         |
| Provider         | Claude, on a MiKode-owned account, through `CLAUDE_CODE_OAUTH_TOKEN`                          |
| Model and effort | `sonnet` at `high` reasoning effort                                                           |
| Provider timeout | 10 minutes per turn, enforced by the runner                                                   |
| Repair attempts  | At most one additional turn to recover a reply that failed contract validation                |
| Evidence budget  | 1,250,000 bytes of prompt, about 500,000 tokens, filled in priority order and never truncated |
| Cost ceiling     | The EUR 30 per month the standard allows for the whole provider account                       |

The standard's provider section still describes Claude Code GitHub Actions. That paragraph is
mutable by a reviewed standard update, and it must be updated to describe `harness-cli` before
this pilot is declared blocking. ADR 0017 needs no change: it is deliberately agnostic about
provider and runtime.

## What runs

The pilot runs for an internal, non-draft pull request targeting `main` when the pull request
is opened, reopened, marked ready, or receives a new commit. A per-pull-request concurrency
group cancels superseded executions, so a new commit discards the result of the previous one.
Analysis starts only after `CI / required` succeeds for the same head commit.

The work is split across jobs that do not share credentials:

| Job                    | Credentials                              | Responsibility                                          |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `Analyze`              | Provider token, read-only GitHub token   | Collect evidence, run the reviewer, validate the result |
| `AI Review / required` | GitHub token with `pull-requests: write` | Revalidate, publish the review, report the check        |

`Analyze` checks out the pull request head without persisted Git credentials and never runs
anything from it. The reviewer's own scripts, the repository instructions, the architecture
document, and the decision log are all read from the base revision, so a pull request cannot
rewrite the reviewer that is about to judge it. The review skill comes from the pinned skills
revision and applicable standards from the current `Mikode13/engineering` main, whose commit is
recorded in the review input.

`AI Review / required` re-runs the full contract validation on the result it receives before it
acts on it, and neutralizes mentions, HTML, and comment markers in every string it renders.

## Evidence, not a workspace

The reviewer receives one prompt and explores nothing. Two properties of the runtime make
that the only reliable design:

- a run without `--auto-approve` has nobody to grant a tool permission, so a request to run a
  command stalls until the deadline instead of failing; and
- `@mikode13/harness` caps a Claude turn at three turns, which is not an exploration budget.

So the analysis job collects the diff, the reviewed files, the pull request description, the
closing issue, the trusted base context, and the applicable standards, and inlines them. Every
section is added whole, in priority order, until the budget is spent; nothing is ever
truncated. What did not fit is declared to the reviewer as a missing source and republished in
the summary under "Context not supplied to the reviewer", which the contract expects it to turn
into reduced coverage rather than a silent pass.

Dropping the trusted `AGENTS.md` or the reviewed files leaves nothing worth reviewing, and so
does supplying a reviewed file only in part, so a reviewed file over 40,000 bytes counts as
missing too. Either way the run is abandoned as `incomplete` before the provider is called
rather than after it returns a vague one.

Lockfiles are the exception. A changed lockfile is reviewed through its diff, which already
shows every package and version that moved; its full resolution graph adds size without review
value, so it is never supplied whole and never counts as oversized. An untouched lockfile
costs nothing, because only the files a pull request changes are supplied.

The prompt reaches `harness-cli` as a file through `--prompt-file`, so the model sets its size
rather than the command line. The 1,250,000-byte budget is about 500,000 tokens at the roughly
2.5 characters per token that Anthropic documents for the current tokenizer. That is half of
Sonnet 5's 1M-token window: it leaves room for the agent's own prompt and the reply, and it
stays below the length at which a long context starts to degrade the review. Every run records
its input tokens in the review report, so the first real runs can confirm the ratio.

Measured against the pinned skill and the current standards:

| Change                                                | Prompt  | Result              |
| ----------------------------------------------------- | ------- | ------------------- |
| The three-file documentation change in pull request 1 | 114 KiB | Everything supplied |
| The eight-file bootstrap in pull request 2            | 250 KiB | Everything supplied |

Until `harness-cli` 1.1.0 the prompt was a single command argument, which Linux caps at
128 KiB. That refused pull request 2 before the provider was called, so the limit was removed
where it lived, in [harness-cli#7](https://github.com/Mikode13/harness-cli/issues/7), rather
than designed around here.

## Outcomes

| Outcome      | Check                           | Merge effect                                                                       |
| ------------ | ------------------------------- | ---------------------------------------------------------------------------------- |
| `clean`      | `AI Review / required` succeeds | Nothing blocks                                                                     |
| `blocked`    | `AI Review / required` succeeds | Each introduced blocking finding opens a review conversation that must be resolved |
| `incomplete` | `AI Review / required` fails    | The gate blocks until a review completes                                           |

A `blocked` execution completed, so its check passes; the unresolved conversations are what
prevent the merge, which is why the repository ruleset must require conversation resolution
alongside the check. This follows the standard. Note that
[Mikode13/engineering#27](https://github.com/Mikode13/engineering/issues/27) still describes
mapping `blocked` to a failing check, which the standard has since superseded.

Pre-existing findings and suggestions keep their real severity, never block, and appear in the
summary. A provider failure, a timeout, a reply that fails contract validation twice, a result
bound to another commit, a result too large to hand between jobs, and an analysis job that did
not succeed all produce `incomplete`. A blocking finding that cannot be anchored to a position
in the diff also fails the check, because a conversation nobody has to resolve would leave the
outcome unenforced.

## Enforcement

`AI Review / required` becomes a required check through a ruleset, which is a setting rather
than code, so enabling it takes no pull request. Three rules decide when it may be enabled:
the [continuous integration standard](https://github.com/Mikode13/engineering/blob/main/standards/continuous-integration.md)
forbids requiring a check before it has reported under that exact name, neither the provider
credential nor the check may be within reach of the pull request, as
[Accepted temporary risk](#accepted-temporary-risk) explains, and the
[automated pull request review standard](https://github.com/Mikode13/engineering/blob/main/standards/automated-pull-request-review.md)
makes the pilot blocking as soon as both hold. The order is therefore:

1. Merge the bootstrap pull request on `CI / required` and human review. Its own
   `AI Review / required` fails by design, because the reviewer is read from the base revision
   and the base does not carry it yet.
2. Open the first end-to-end case. It is the first review run from a trusted base, and its
   `AI Review / required` must succeed before anything requires it.
3. Merge the standard update that describes `harness-cli` and these enforcement rules,
   [Mikode13/engineering#41](https://github.com/Mikode13/engineering/pull/41).
4. Put the provider credential and the check out of a branch's reach, as
   [Accepted temporary risk](#accepted-temporary-risk) describes.
5. Require `AI Review / required`, then run the remaining pilot cases under the blocking gate.

Neither organization ruleset has a bypass actor, so requiring the check before step 1 would
leave the bootstrap pull request unmergeable.

The check belongs in a ruleset of its own:

| Setting                 | Value                                               |
| ----------------------- | --------------------------------------------------- |
| Target                  | `slop-lab`, default branch                          |
| Rule                    | Require the status check `AI Review / required`     |
| Bypass                  | Organization administrators, for pull requests only |
| Conversation resolution | Already required by the `main-baseline` ruleset     |

Do not add the check to `required-ci`. That organization ruleset is shared with repositories
that have no workflow reporting `AI Review / required`, and every pull request there would
wait for it indefinitely. A separate organization ruleset whose target grows as repositories
adopt the central reviewer follows the way `required-ci` grows with CI adoption.

The bypass exists because the standard lets an authorized maintainer merge past an
`incomplete` review for an exceptional need, recording the reason, the reviewed head commit,
and the person accepting the risk in the pull request. A pull-request-only bypass keeps that a
decision about one merge. Without it, the only way past a provider outage is to edit the
ruleset, which turns the gate off for every other pull request at the same time.

GitHub reports a job skipped by its condition as successful, and a skipped required check does
not block a merge. The workflow therefore never skips its way past the gate:

- a base revision without the reviewer or the publisher fails the check, so removing the
  reviewer from `main` blocks later pull requests instead of quietly turning the gate off;
- a pull request from a fork fails the check, because it receives no provider secret and
  cannot be reviewed; and
- only a draft skips, because a draft cannot merge and marking it ready starts a new review.

## Credential setup

The workflow expects a repository Actions secret named `CLAUDE_CODE_OAUTH_TOKEN`. Generate it
while authenticated to the dedicated MiKode Claude account:

```sh
claude setup-token
gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo Mikode13/slop-lab
```

Both commands prompt locally. Do not paste the token into an issue, a pull request, a committed
file, a command argument, or chat. Rotate or remove the secret immediately if it is exposed.

Only the analysis job receives it. The publication job receives a scoped GitHub token and no
provider credential.

## Pilot cases

The change that was reserved as the first case,
[pull request 1](https://github.com/Mikode13/slop-lab/pull/1), merged before the reviewer
existed, so the first end-to-end case has to be a new one. It should exercise the same property
that one would have: a change whose known `src/` defects are pre-existing, so the expected
result is `clean` with those defects reported as non-blocking follow-up work.

The mechanical cases below do not need the provider: `REVIEWER_COMMAND` replaces `harness-cli`
with a command that returns a prepared reply, which is how the failure paths are exercised
without spending quota or waiting on a real run.

| Case                                           | Expected result                             |
| ---------------------------------------------- | ------------------------------------------- |
| Small correct change                           | `clean`                                     |
| Introduced functional regression               | `blocked`                                   |
| Known debt left untouched                      | `clean`, reported as non-blocking follow-up |
| No change contract in issue or description     | `incomplete`                                |
| Instructions rewritten by the pull request     | No effect on the reviewer; ordinary result  |
| New commit while the review runs               | Previous result superseded and discarded    |
| Duplicate delivery for one commit              | One review per commit                       |
| Truncated or invalid reply                     | One repair attempt, then `incomplete`       |
| Provider failure or exhausted quota            | `incomplete`                                |
| Passing test that does not prove the behaviour | `blocked`                                   |

The rules that decide merge authority without the provider also have focused tests in
[`.github/ai-review/tests`](../.github/ai-review/tests). `pnpm run check` runs them through
`pnpm run test:ai-review`, so `CI / required` fails when one of them does. They use the
Node.js test runner rather than Vitest, because they test temporary pilot tooling and must not
stand in for the test suite that `src/` still lacks by design.

[Mikode13/engineering#28](https://github.com/Mikode13/engineering/issues/28) also asks for
fixed passes to be compared against risk-routed depth on the same cases. `REVIEW_MODEL` and
`REVIEW_EFFORT` are workflow-level settings so that comparison changes one variable at a time.

The expected findings and scoring notes for each case must stay outside every source the
reviewer can read while that case runs.

## Promotion and rollback

Promote only after roughly ten to twelve controlled executions show:

- every seeded blocker detected, and no blocking finding on a change known to be correct;
- no result attributed to the wrong commit, and no duplicate review;
- no execution of head code or head configuration, and no secret in a log, prompt, or artifact;
- the correct check and merge effect for `clean`, `blocked`, and `incomplete`;
- accidental `incomplete` at or below one execution in ten, excluding the cases that force a
  failure;
- a projected monthly cost within the EUR 30 ceiling; and
- a measurable difference between candidates raised and findings confirmed after verification.

Promotion takes two pull requests. The first moves the workflow, the runner, the contract
validator, the publisher, and fixtures to `Mikode13/.github` as the reusable workflow required
by [Mikode13/engineering#27](https://github.com/Mikode13/engineering/issues/27). The second
replaces this implementation with a caller pinned to that full commit SHA, after which the
same cases are repeated to confirm the results do not change. The caller job is named
`AI Review` and the reusable job `required`, so GitHub keeps reporting `AI Review / required`
and the ruleset does not change. From then on, as with CI, a reviewer update reaches this
repository as a reviewed pull request that bumps the pinned SHA, and the previous SHA is the
rollback target.

Until then, rollback means removing the pilot workflow and its ruleset together. The
pre-pilot revision is
[`db58dfd`](https://github.com/Mikode13/slop-lab/commit/db58dfd9eef6855548f0fee2be3d8a30b6907c3a).
Removing or disabling the workflow must not leave `AI Review / required` configured as a
required check nothing can satisfy.

## Accepted temporary risk

Under `pull_request`, GitHub runs every workflow as the pull request branch defines it,
including workflows the branch adds. Reading the reviewer's scripts from the base revision
protects the reviewer, but neither the provider token nor the check:

- `CLAUDE_CODE_OAUTH_TOKEN` is readable by any workflow that a branch of this repository runs,
  not only by `ai-review.yml`, so a branch can add a workflow that exfiltrates it. A fork
  cannot, because it receives no secret.
- A branch, and a fork once its workflows are allowed to run, can report a passing
  `AI Review / required` without a review, by editing this workflow or by adding one with a job
  of that name. GitHub matches a required check by its name, and every such job reports through
  GitHub Actions. `CI / required` has the same weakness.

The pilot accepts that risk only while all of these hold:

- the maintainer has accepted it explicitly on the bootstrap pull request;
- only trusted maintainers and their agents push branches to this repository; and
- `AI Review / required` is not a required check.

Before the check is required, and before promotion, both have to be closed:

- The token moves into an environment whose deployment branches are limited to `main`. A job
  triggered by `pull_request` runs on `refs/pull/N/merge` and cannot read it, so the review
  job has to run in the default branch's context, through `pull_request_target` or
  `workflow_run`, refuse forks before it reads the secret, and still never execute code from
  the head.
- The required check has to come from something a branch cannot produce: either a ruleset rule
  that requires a pinned workflow, if the organization's plan offers it, or a check run
  published by a MiKode GitHub App that the ruleset names as the check's source. A push
  ruleset that stopped branches from changing workflows would also work, but GitHub offers push
  rulesets only to private and internal repositories, and this one is public.

## Known limitations

- A pull request from a fork is not reviewed. It receives no provider secret, so `Analyze`
  skips it and `AI Review / required` fails; the gate assumes same-repository branches for the
  duration of the pilot.
- A reviewed file over 40,000 bytes, other than a lockfile, makes the run `incomplete`.
- The runner does not normalize intent. It supplies the closing issue and the description and
  asks the reviewer to resolve the change contract itself, rather than guessing which prose is
  an acceptance criterion.
