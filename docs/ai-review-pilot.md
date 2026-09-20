# AI review pilot

slop-lab piloted the AI review that
[Mikode13/.github](https://github.com/Mikode13/.github) now provides as a reusable workflow. The
pilot ran here, on this repository's own pull requests, until live runs stopped exposing
pipeline defects. This repository keeps a thin caller pinned to a full commit SHA and runs a
newer revision than other repositories, as a canary.

The reviewer's behaviour, frozen configuration, and limitations are documented with the
workflow, in [AI review behaviour](https://github.com/Mikode13/.github/blob/main/docs/ai-review.md), and change with it. This document keeps only what
belongs to slop-lab: the credential, the pilot cases, how the reviewer was promoted, how the
gate is enforced here, and the risk accepted while it is not required.

## Enforcement

`AI Review / required` is reported but not required. A ruleset can require it by name, the way
`required-ci` requires `CI / required`, and the standard makes the review blocking as soon as
that is done. The status is matched by name, so the weakness in
[Accepted temporary risk](#accepted-temporary-risk) applies until a required workflow from a
fixed repository and revision replaces it, which is a separate decision.

GitHub reports a job skipped by its condition as successful, and a skipped required check does
not block a merge. The workflow therefore never skips its way past the gate:

- a pull request from a fork reports a failing status, because it cannot be reviewed; and
- only a draft gets no status, because a draft cannot merge and marking it ready starts a new
  review.

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

The mechanical cases below do not need the provider: the reviewer's tests in `Mikode13/.github`
replace `harness-cli` with a command that returns a prepared reply, which is how the failure
paths are exercised without spending quota or waiting on a real run.

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

The rules that decide merge authority without the provider have focused tests in
[`ai-review/tests`](https://github.com/Mikode13/.github/tree/main/ai-review/tests) of
`Mikode13/.github`, which run in its `pnpm test`. They use the Node.js test runner, and
this repository no longer carries them.

[Mikode13/engineering#28](https://github.com/Mikode13/engineering/issues/28) also asks for
fixed passes to be compared against risk-routed depth on the same cases. The model and effort
are settings of the reusable workflow, so that comparison is a change there, adopted here as a
new pinned SHA.

The expected findings and scoring notes for each case must stay outside every source the
reviewer can read while that case runs.

## Promotion and rollback

The reviewer moved to `Mikode13/.github` in
[Mikode13/.github#15](https://github.com/Mikode13/.github/pull/15), as a reusable workflow that
a caller pins by full commit SHA. The criteria the pilot set were judged by the maintainer on
live runs: the layered-architecture migration in
[pull request 21](https://github.com/Mikode13/slop-lab/pull/21) converged across its pushes
with no pipeline defect, and later pull requests ran the same way. The workflow, the runner,
the contract validator, the publisher, and their tests moved, and this repository's copy was
removed in the pull request that added the caller.

This repository is the canary: it moves to a newer SHA first, and other repositories move
their pin only after it has reviewed real pull requests. Rolling back is moving the caller's
pin to the previous SHA. To stop reviewing, remove the caller and the `ai-review` environment;
nothing requires `AI Review / required` yet, so no check waits.

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

Promotion does not close it. Only a workflow that a ruleset requires from a fixed repository
and revision is something no branch can produce. A push ruleset that stopped branches from
changing workflows would close it sooner, but GitHub offers push rulesets only to private and
internal repositories, and this one is public.
