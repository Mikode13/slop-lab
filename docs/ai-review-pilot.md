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
| Review skill     | `mikode-review` from `Mikode13/skills` at `e62054e`, release 1.0.1                            |
| Provider         | Claude, on a MiKode-owned account, through `CLAUDE_CODE_OAUTH_TOKEN`                          |
| Model and effort | `opus` at `high` reasoning effort                                                             |
| Provider timeout | 15 minutes per turn, enforced by the runner                                                   |
| Repair attempts  | At most one additional turn to recover a reply that failed contract validation                |
| Evidence budget  | 1,250,000 bytes of prompt, about 500,000 tokens, filled in priority order and never truncated |
| Cost ceiling     | The EUR 30 per month the standard allows for the whole provider account                       |

Since [Mikode13/engineering#41](https://github.com/Mikode13/engineering/pull/41), the standard
describes `harness-cli` and the merge rules this pilot follows. ADR 0017 needed no change: it
leaves provider, runtime, and severity rules to the standard.

## What runs

The pilot runs for an internal, non-draft pull request targeting `main` when the pull request
is opened, reopened, marked ready, or receives a new commit. It is triggered by
`pull_request_target`, so GitHub runs the workflow as it is on `main`, never as the pull
request defines it, and only such a run can read the `ai-review` environment that holds the
provider token. A per-pull-request concurrency group cancels superseded executions, so a new
commit discards the result of the previous one. Analysis starts only after `CI / required`
succeeds for the same head commit. When that check fails or does not finish within ten
minutes, the review stops without calling the reviewer, and its summary says why. A pull request
that conflicts with `main` stops it at once, because GitHub runs no CI on it.

The work is split across jobs that do not share credentials:

| Job       | Credentials                                                    | Responsibility                                                               |
| --------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `Analyze` | Provider token from `ai-review`, read-only GitHub token        | Collect evidence and earlier findings, run the reviewer, validate the result |
| `Publish` | GitHub token with `pull-requests: write` and `statuses: write` | Revalidate, comment findings, update the summary, report the status          |

`Analyze` checks out the pull request head without persisted Git credentials and reads it as
data: nothing from it runs, and the reviewer starts in a separate work directory. The
reviewer's progress output, which the pull request can influence, is printed with workflow
commands switched off. The reviewer's own scripts, the repository instructions, the
architecture document, and the decision log are all read from the base revision, so a pull
request cannot rewrite the reviewer that is about to judge it. The base revision is the commit
of `main` the workflow itself was read from, not the base commit recorded in the pull request,
which can be older: a pull request opened before a change to the pilot would otherwise run the
new workflow with the old scripts. The reviewed diff starts where the pull request diverges
from it. The review skill comes from the pinned skills revision and applicable standards from
the current `Mikode13/engineering` main, whose commit is recorded in the review input.

`Publish` re-runs the full contract validation on the result it receives before it acts on it,
and neutralizes mentions, HTML, and comment markers in every string it renders. Under
`pull_request_target`, `GITHUB_SHA` is the latest commit of `main` rather than the reviewed
commit, so the job reports the outcome explicitly, as the commit status
`AI Review / required` of the reviewed commit.

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

From the pinned skills revision, the prompt carries `mikode-review` and its contract, the three
specialist skills it coordinates, and `mikode-code-philosophy`, whose criteria the code
specialist applies. MiKode policy reaches the reviewer as the Active standards above, in place
of `mikode-context`, which the review skill accepts. The skills' validation cases and the
specialists' calibration examples are left out, because the skills reserve them for
validating the skills rather than for ordinary reviews.

The prompt also shows one example of every object in the result, generated from the pilot's
validator and tested against it. Given only the contract's prose, first replies kept adding or
dropping fields, such as `checked_sources` on every recheck. It also tells the reviewer to keep
finding IDs out of anything a person reads, except as the `F1:` prefix that moves a follow-up
item into that finding's comment.

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
Opus 5's 1M-token window: it leaves room for the agent's own prompt and the reply, and it
stays below the length at which a long context starts to degrade the review. The report records
the tokens `harness-cli` returns, but that figure cannot confirm the ratio yet: `harness` counts
only uncached input, so the first real review reported 2 input tokens for a 143,506-byte
prompt.

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

Among findings, only a `BLOCKER` fails the check. Its severity comes from the harm it describes,
so it fails the check whether or not the change introduced it.

| Outcome       | Check                           | What it means                                                       |
| ------------- | ------------------------------- | ------------------------------------------------------------------- |
| `blocked`     | `AI Review / required` fails    | At least one `BLOCKER`                                              |
| `concerns`    | `AI Review / required` succeeds | A `SHOULD FIX` of the change, and no `BLOCKER`                      |
| `suggestions` | `AI Review / required` succeeds | Only `SUGGESTION` findings of the change                            |
| `clean`       | `AI Review / required` succeeds | Nothing to change, though findings outside the change may be listed |
| `incomplete`  | `AI Review / required` fails    | No review that can be trusted; the gate blocks until one completes  |

Every `SHOULD FIX` and `SUGGESTION` of the change opens a conversation, and the `main-baseline`
ruleset requires every conversation to be resolved before a merge, so each one holds the merge
until a person reads and resolves it. The comment says what resolving it takes. A `SHOULD FIX`
is resolved only after fixing it in the code or opening an issue that tracks it, and a
`SUGGESTION` can be resolved once read, with or without a change. A finding that is wrong is
resolved with a reply that says why. Nothing checks those conditions yet.

A provider failure, a timeout, a reply that fails contract validation twice, a result bound to
another commit, a result too large to hand between jobs, an analysis job that did not succeed,
and a result that does not recheck every earlier finding all produce `incomplete`.

Each execution decides the status from its own result, never from what is already on the pull
request, so a retry after an `incomplete` review publishes its own result. Publishing the same
report again writes nothing, because every comment carries the key of its finding. To retry,
use "Re-run all jobs": re-running only the failed jobs publishes the same report again without
a new review.

The reasons a reply failed contract validation go to the job log and the review report, even
when the repair succeeds, because they show which part of the contract a first reply gets
wrong. Each reason names the fields that are missing or not in the contract, so the repair
knows what to change. When the repair fails too, the pull request is told only that the reply
did not satisfy the contract. A review of pull request 6 took 584 seconds of a 600-second turn,
so each turn now has fifteen minutes.

## Findings on the pull request

A finding appears where a person reviewing by hand would put it:

| Finding                                                          | Where it appears                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| A `BLOCKER`, or any finding of the change, on a line of the diff | A comment on that line, which opens a conversation      |
| The same, about a whole file of the diff                         | A comment on the file's first changed line that says so |
| The same, about a line GitHub cannot comment on                  | The summary, with its reasoning                         |
| A finding outside the change, below `BLOCKER`                    | One line in the summary for a maintainer to triage      |

The summary is one pull request comment that every later review updates in place. It holds the
outcome, the blocking findings, what could not go on a line, the reviewer's questions and
limitations, and the context the reviewer did not receive. A review that ends without a valid
result still lists the findings the previous summary held, as that review described them. How
each perspective was reviewed, each recheck, and why a reply was rejected go to the job
summary.

Each review covers the whole pull request, from where it branched off `main` to its latest
commit. Before a later review, the analysis job collects every finding earlier reviews
published: those with a conversation, open or closed, and those the summary lists. The reviewer
rechecks each one against the new commit. Checking a named finding is more reliable than
expecting to discover it again, so a finding the reviewer does not find again is not taken as
fixed:

- **Still present:** no new comment. If the commented code moved, one reply in the open
  conversation says where it is now. A `BLOCKER` whose conversation was closed still blocks,
  and the summary says so. A suggestion someone resolved that is found again as a `SHOULD FIX`
  or `BLOCKER` has its conversation reopened once, with a reply that says so.
- **Looks fixed:** one reply in an open conversation says why, and the conversation stays open
  for a person to close. A finding without a conversation is named in the summary once, then
  dropped.
- **Cannot be decided:** named in the summary and rechecked next time. An earlier `BLOCKER`,
  or an earlier finding that never had a severity, that cannot be decided makes the review
  `incomplete`.

Apart from reopening a resolved suggestion that got worse, the publisher never resolves, reopens,
or deletes a conversation. Whether a conversation was closed is not given to
the reviewer either: it is a decision about the pull request, not
evidence about the code. The reviewer receives only what the earlier review wrote, fenced like
any other reviewed content.

## Enforcement

During the pilot, `AI Review / required` is reported but not required. Requiring it needs a
result that no branch can produce, and without a GitHub App the way to get one is the ruleset
rule "Require workflows to pass before merging", which requires a workflow from a fixed
repository and revision. That rule cannot require a workflow in the repository that holds it,
so it arrives with promotion. A GitHub App would close the gap sooner, but promotion would
remove it again. The
[automated pull request review standard](https://github.com/Mikode13/engineering/blob/main/standards/automated-pull-request-review.md)
makes the pilot blocking as soon as the check can be required, so the order is:

1. Merge the bootstrap pull request on `CI / required` and human review. GitHub runs
   `pull_request_target` workflows as they are on `main`, and `main` does not carry this one
   yet, so the bootstrap pull request gets no review at all.
2. Create the `ai-review` environment and move the token into it, as
   [Credential setup](#credential-setup) describes.
3. Run the first end-to-end case and the remaining pilot cases, with the status reported but
   not required.
4. Align the standard with the pilot, which
   [Mikode13/engineering#41](https://github.com/Mikode13/engineering/pull/41) did.
5. Promote, and create the review ruleset in the same change.

The review ruleset:

| Setting                 | Value                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Target                  | The adopting repositories, default branch                                                                             |
| Rule                    | Require workflows to pass before merging: `Mikode13/.github`, `.github/workflows/ai-review.yml`, at a full commit SHA |
| Bypass                  | Organization administrators, for pull requests only                                                                   |
| Conversation resolution | Already required by the `main-baseline` ruleset                                                                       |

Do not add it to `required-ci`. That organization ruleset is shared with repositories that do
not run the reviewer, and every pull request there would wait for a review that never comes. A
separate organization ruleset whose target grows as repositories adopt the reviewer follows
the way `required-ci` grows with CI adoption.

The bypass exists because the standard lets an organization owner merge past a `blocked` or
`incomplete` review for an exceptional need, recording the reason, the reviewed head commit,
and the person accepting the risk in the pull request. A ruleset bypass cannot tell why the
check failed, so only organization administrators hold it, and only for pull requests, which
keeps each exception a decision about one merge. Without it, the only way past a provider
outage is to edit the ruleset, which turns the gate off for every other pull request at the
same time. It also
covers the first run of the required workflow, which only the rule itself starts: the
[continuous integration standard](https://github.com/Mikode13/engineering/blob/main/standards/continuous-integration.md)
forbids requiring a check before it has reported, and here the rule is what makes it report.

GitHub reports a job skipped by its condition as successful, and a skipped required check does
not block a merge. The workflow therefore never skips its way past the gate:

- a base revision without the reviewer or the publisher reports a failing status, so removing
  the reviewer from `main` fails later reviews instead of quietly passing them;
- a pull request from a fork reports a failing status, because it cannot be reviewed; and
- only a draft gets no status, because a draft cannot merge and marking it ready starts a new
  review.

A workflow that a ruleset requires behaves differently in two ways the promoted version must
handle. GitHub runs it only for the default activity types, `opened`, `synchronize`, and
`reopened`, so marking a draft ready does not start it again, and it must fail for a draft
instead of skipping it. Re-running a run repeats the draft event, so it must read the draft
state from the API; a re-run after the pull request leaves draft, started by a trusted
`ready_for_review` workflow or by a maintainer, then reviews the head without a new commit.
And it must not use `cancel-in-progress`, so a superseded run has to stop itself instead of
being cancelled.

## Credential setup

The token lives in the `ai-review` environment of this repository, never in a repository or
organization secret, because any workflow a branch runs can read those. A job can read an
environment secret only by declaring the environment, and with deployment branches limited to
`main` only a run from `main` can declare it:

1. Create the environment `ai-review`, with deployment branches and tags limited to the
   selected branch `main`.
2. Generate the token while authenticated to the dedicated MiKode Claude account, and store it
   in the environment:

   ```sh
   claude setup-token
   gh secret set CLAUDE_CODE_OAUTH_TOKEN --env ai-review --repo Mikode13/slop-lab
   ```

3. Remove `slop-lab` from the repositories that can use the organization secret
   `CLAUDE_CODE_OAUTH_TOKEN`, and delete any repository secret of that name. While either is
   reachable, a branch can still read the token.

Both commands prompt locally. Do not paste the token into an issue, a pull request, a committed
file, a command argument, or chat. Rotate or remove the secret immediately if it is exposed.

Only the analysis job declares the environment. The publication job receives a scoped GitHub
token and no provider credential.

## Pilot cases

The change that was reserved as the first case,
[pull request 1](https://github.com/Mikode13/slop-lab/pull/1), merged before the reviewer
existed, so the first end-to-end case has to be a new one. It should exercise the same property
that one would have: a change whose known `src/` defects are pre-existing, so the expected
result is `clean` with those defects listed for triage.

The mechanical cases below do not need the provider: `REVIEWER_COMMAND` replaces `harness-cli`
with a command that returns a prepared reply, which is how the failure paths are exercised
without spending quota or waiting on a real run.

| Case                                                  | Expected result                                 |
| ----------------------------------------------------- | ----------------------------------------------- |
| Small correct change                                  | `clean`                                         |
| Change that breaks the behaviour it exists to provide | `blocked`                                       |
| Change that fails only under particular conditions    | `concerns`                                      |
| Known debt left untouched                             | `clean`, with the debt listed for triage        |
| No change contract in issue or description            | `incomplete`                                    |
| Instructions rewritten by the pull request            | No effect on the reviewer; ordinary result      |
| New commit while the review runs                      | Previous result superseded and discarded        |
| New commit after a review                             | Earlier findings rechecked; none reported twice |
| Duplicate delivery for one commit                     | Nothing published twice                         |
| Re-run after an `incomplete` review                   | New result published; it sets the status        |
| Truncated or invalid reply                            | One repair attempt, then `incomplete`           |
| Provider failure or exhausted quota                   | `incomplete`                                    |
| Passing test that does not prove the behaviour        | `concerns`                                      |

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
- no result attributed to the wrong commit;
- no execution of head code or head configuration, and no secret in a log, prompt, or artifact;
- the correct check and merge effect for every outcome;
- no finding reported twice, and no earlier finding lost, across the commits of a pull request;
- accidental `incomplete` at or below one execution in ten, excluding the cases that force a
  failure;
- a projected monthly cost within the EUR 30 ceiling; and
- a measurable difference between candidates raised and findings confirmed after verification.

Promotion moves the workflow, the runner, the contract validator, the publisher, and fixtures
to `Mikode13/.github`, the home
[Mikode13/engineering#27](https://github.com/Mikode13/engineering/issues/27) tracks, and the
review ruleset then requires that workflow at a full commit SHA. This repository keeps no
caller, because the ruleset runs the workflow, and a pull request here removes the local
implementation. The same cases are repeated to confirm the results do not change. From then on
a reviewer update is a reviewed pull request in `Mikode13/.github` followed by a change of the
SHA the ruleset pins, and the previous SHA is the rollback target.

Until then, rollback means removing the pilot workflow and the `ai-review` environment. The
pre-pilot revision is
[`db58dfd`](https://github.com/Mikode13/slop-lab/commit/db58dfd9eef6855548f0fee2be3d8a30b6907c3a).
Nothing requires `AI Review / required` during the pilot, so removing the workflow leaves no
check waiting.

## Accepted temporary risk

The review runs from `main` through `pull_request_target`, and the token lives in an
environment that only a run from `main` can read, so a branch can neither edit this workflow
nor read the token. The check is the part still within reach. Under `pull_request`, GitHub
runs every workflow a branch defines or adds, and any of them can report a passing
`AI Review / required` for the branch's commit, because GitHub matches a status by its name. A
fork can too, once its workflows are allowed to run. `CI / required` has the same weakness.

The pilot accepts that only while all of these hold:

- the maintainer has accepted it explicitly on the bootstrap pull request;
- only trusted maintainers and their agents push branches to this repository; and
- `AI Review / required` is not required.

Promotion closes it, because a workflow that a ruleset requires from a fixed repository and
revision is something no branch can produce. A push ruleset that stopped branches from
changing workflows would close it sooner, but GitHub offers push rulesets only to private and
internal repositories, and this one is public.

## Known limitations

- A pull request from a fork is not reviewed. `pull_request_target` would let its run read the
  environment, so `Analyze` refuses a fork before it starts and `Publish` reports a failing
  status; the pilot assumes same-repository branches.
- A reviewed file over 40,000 bytes, other than a lockfile, makes the run `incomplete`.
- The runner does not normalize intent. It supplies the closing issue and the description and
  asks the reviewer to resolve the change contract itself, rather than guessing which prose is
  an acceptance criterion.
