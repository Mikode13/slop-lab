# AI review pilot

slop-lab temporarily owns an executable AI review workflow so that the review contract can be
tested on real pull requests before it becomes a reusable workflow in `Mikode13/.github`. This
is a bounded pilot, not a project-specific replacement for the central workflow that the
[automated pull request review standard](https://github.com/Mikode13/engineering/blob/main/standards/automated-pull-request-review.md)
requires.

## Frozen configuration

A pilot that changes while it is measured proves nothing, so these are fixed for its duration
and recorded in [the workflow](../.github/workflows/ai-review.yml):

| Choice           | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| Reviewer command | `@mikode13/harness-cli@1.0.1`                                                  |
| Review skill     | `mikode-review` from `Mikode13/skills` at `6015886`, the `v0.3.0` tag          |
| Provider         | Claude, on a MiKode-owned account, through `CLAUDE_CODE_OAUTH_TOKEN`           |
| Model and effort | `sonnet` at `high` reasoning effort                                            |
| Provider timeout | 10 minutes per turn, enforced by the runner                                    |
| Repair attempts  | At most one additional turn to recover a reply that failed contract validation |
| Cost ceiling     | The EUR 30 per month the standard allows for the whole provider account        |

The standard's provider section still describes Claude Code GitHub Actions. That paragraph is
mutable by a reviewed standard update, and it must be updated to describe `harness-cli` before
this pilot is declared blocking. ADR 0017 needs no change: it is deliberately agnostic about
provider and runtime.

## What runs

The pilot runs for an internal, non-draft pull request targeting `main` when the pull request
is opened, reopened, marked ready, or receives a new commit. A per-pull-request concurrency
group cancels superseded executions, so a new commit discards the result of the previous one.
Analysis starts only after `CI / required` succeeds for the same head commit.

The work is split across two jobs that do not share credentials:

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

The reviewer receives one prompt and explores nothing. Three properties of the runtime make
that the only reliable design:

- `harness-cli single-turn` takes its prompt as a single command argument, and Linux caps one
  argument at 128 KiB;
- a run without `--auto-approve` has nobody to grant a tool permission, so a request to run a
  command stalls until the deadline instead of failing; and
- `@mikode13/harness` caps a Claude turn at three turns, which is not an exploration budget.

So the analysis job collects the diff, the reviewed files, the pull request description, the
closing issue, the trusted base context, and the applicable standards, and inlines them. Every
section is added whole, in priority order, until the budget is spent; nothing is ever
truncated. What did not fit is declared to the reviewer as a missing source and republished in
the summary under "Context not supplied to the reviewer", which the contract expects it to turn
into reduced coverage rather than a silent pass.

Dropping the trusted `AGENTS.md` or the reviewed files leaves nothing worth reviewing, so
the run is abandoned as `incomplete` before the provider is called rather than after it
returns a vague one.

The budget does not currently hold this repository's work. Two measurements against the
pinned skill and the current standards:

| Change                                                | Prompt  | Result                                                                                                                                      |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| The three-file documentation change in pull request 1 | 113 KiB | Runs, having displaced only the README                                                                                                      |
| The eight-file bootstrap in pull request 2            | 116 KiB | Refused: the reviewed files, all three specialist guides, the architecture document, the decision log, and two standards were all displaced |

So an ordinary change in this repository does not fit, and the limit binds on the smallest
real one. The evidence an eight-file change needs is 249 KiB, roughly twice what the transport
can carry, and 93 KiB of that is fixed cost that does not depend on the change at all.

[harness-cli#7](https://github.com/Mikode13/harness-cli/issues/7) tracks the fix: accepting the
prompt from a file or stdin. Until it ships, the pilot can only measure small changes, and the
promotion criterion on accidental `incomplete` is not reachable for ordinary ones. Adopting it
means raising the pinned `harness-cli` version, passing the prompt by file, and revisiting the
budget in `build-prompt.mjs`.

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
existed, so the first end-to-end case has to be a new one. It should be small enough to fit the
prompt budget and should exercise the same property that one would have: a change whose known
`src/` defects are pre-existing, so the expected result is `clean` with those defects reported
as non-blocking follow-up work.

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

Promotion moves the workflow, the runner, the contract validator, the publisher, and fixtures
to `Mikode13/.github` as the reusable workflow required by
[Mikode13/engineering#27](https://github.com/Mikode13/engineering/issues/27), replaces this
implementation with a caller pinned to a full commit SHA, and repeats the same cases to confirm
the results do not change. That pinned SHA is the rollback target afterwards.

Until then, rollback means removing the pilot workflow and its ruleset entry together. The
pre-pilot revision is
[`db58dfd`](https://github.com/Mikode13/slop-lab/commit/db58dfd9eef6855548f0fee2be3d8a30b6907c3a).
Removing or disabling the workflow must not leave `AI Review / required` configured as a
required check nothing can satisfy.

## Known limitations

- A pull request from a fork gets no review: it receives no secret, and the jobs skip it. The
  required check would therefore never report, so the gate assumes same-repository branches for
  the duration of the pilot.
- Under `pull_request`, GitHub reads the workflow file itself from the pull request head. The
  reviewer's scripts are read from the base revision, but the workflow that calls them is not.
  Moving to the central reusable workflow with a pinned caller closes this.
- The runner does not normalize intent. It supplies the closing issue and the description and
  asks the reviewer to resolve the change contract itself, rather than guessing which prose is
  an acceptance criterion.
