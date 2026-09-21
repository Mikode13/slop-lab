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
check and blocks the merge through unresolved conversations instead. (Superseded: since "Hold
the merge only for blockers and recheck earlier findings", a `BLOCKER` fails the check.)
Promotion must preserve that behavior, add the reusable contract and fixtures the central repository requires, and
delete the local implementation rather than let two reviewers drift. (Amended: "slop-lab calls the
central AI reviewer as a canary" records the move; the local implementation is gone and this
repository keeps a thin caller.)

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
recorded reason, instead of an edit to the ruleset. (Since "Hold the merge only for blockers
and recheck earlier findings", the same bypass covers `blocked`, and only organization owners
hold it. Since "slop-lab calls the central AI reviewer as a canary", the reviewer travels with
the pinned workflow, so a base revision without one no longer occurs.)

**Lesson.** On a required check, skipped means passed. A condition that skips a gate opens it,
so every path that cannot produce a review has to fail.

## Put the token and the check out of a branch's reach before the gate is required

**Decision.** The review runs through `pull_request_target`, from `main`, and the provider
token lives in an `ai-review` environment that only a run from `main` can read. The check stays
unrequired until promotion, when a ruleset requires the central workflow at a pinned commit. (Amended: promotion arrived as a
pinned caller, and the check is still unrequired and matched by name. Requiring it waits for a
ruleset that requires the pinned workflow or a dedicated GitHub App; see "slop-lab calls the
central AI reviewer as a canary".)
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

## Hold the merge only for blockers and recheck earlier findings

**Decision.** Severity follows harm, and only a `BLOCKER` fails `AI Review / required`,
whether or not the change introduced it. Every `SHOULD FIX` and `SUGGESTION` of the change is
a comment on its line whose conversation holds the merge until a person resolves it: a
`SHOULD FIX` only with a code change or an issue, a `SUGGESTION` once read. Findings unrelated
to the change are listed for triage in one summary comment that later reviews update in place.
A later review rechecks every finding earlier reviews published, and only organization owners
may merge past `blocked` or `incomplete`.

**Context.** The first real reviews, on pull requests 5 and 6, were correct but hard to act on.
Their summaries repeated every perspective and every finding's reasoning. Merge authority
followed origin, so an ordinary introduced bug blocked like an exploit while a pre-existing
exploit never could. Each new commit started a review that remembered nothing, and a finding
the model did not happen to find again would have looked fixed. Mikode13/skills 1.0.1 and
Mikode13/engineering#41 settled the new rules before this implementation.

**Consequences.** The publisher never resolves or deletes a conversation. It answers in one
when its finding looks fixed or has moved, and reopens a resolved suggestion once if the same
defect is found again as a `SHOULD FIX` or `BLOCKER`. Earlier findings travel back to the
reviewer as data, and one it cannot decide makes the review `incomplete` when it is or may be
a `BLOCKER`. A ruleset bypass cannot tell `blocked` from `incomplete`, so both belong to the
owners. Promotion must carry these rules, not the ones the first pilot entry describes.

**Lesson.** A review gate earns trust when it reads like a colleague's review: severity by
harm, comments where the code is, and a memory of what it already said. Asking whether a
named problem still exists is more reliable than hoping the model finds it again.

## Give the Pokémon feature domain, application, infrastructure, and UI folders

**Decision.** `src/pokemon/` is split into `domain/` (`model/` plus the `pokemonRepository`
port under `repository/`), `application/` (`getAllPokemonDetailsUseCase.ts` directly — no
`useCase/` subfolder, since application holds only use cases and a folder that separates one
kind of artifact from nothing else earns its keep only once a second kind exists),
`infrastructure/` (`model/` for the PokéAPI response shapes and mappers, `repository/` for
the adapter), and `ui/`. Each layer's subfolder groups files by artifact kind so a module
with several models, ports, or adapters does not collapse into one flat directory; a port's
folder is named for what kind of contract it is (`repository/` here) rather than a generic
`interfaces/`, since a domain can define other kinds of ports later that aren't
repository-shaped. The composition root and a dependency-injection library stay out of this
pull request; the use case still constructs its own `PokemonApiRepository` directly, and
that construction moves only once the composition root lands (tracked as
[issue #18](https://github.com/Mikode13/slop-lab/issues/18); see "Let application construct
infrastructure directly until the composition root lands" below).

**Context.** On `main`, `src/PokemonBrowser.tsx` is one component that calls PokéAPI directly
through axios, types both responses as plain interfaces, and renders straight from
`response.data` — no domain, application, or infrastructure separation exists yet. Splitting
it into layers meant deciding how the new infrastructure layer would map a raw response into
a domain model. An early version of that mapping, written and caught while building this same
pull request — so it never reached `main` and isn't visible by comparing this change to its
base — used classes with a `toDomain()` method (`PokemonDetailResponseImpl`,
`PokemonListResponse`) that axios was expected to construct from the raw HTTP response. Axios
never does that: `axios.get<T>()` is a compile-time type assertion, so `response.data` would
have stayed a plain object and every call to `.toDomain()` would have thrown at runtime. A
second, independent mistake called `.transform()` on a plain array. Both would have passed
`pnpm run typecheck` right up until the array one was exercised, because the class-based shape
looked correct to the type checker; neither shipped. Two use cases created while exploring
this design (`getPokemonsUseCase`, `getPokemonDetailUseCase`) were similarly never wired to
the UI and were dropped before merge rather than kept for a listing-without-detail view that
isn't planned. Separately, the list-entry domain model was first named `PokemonDto` —
transport vocabulary that doesn't belong in the domain layer, and inconsistent with the
`<Thing>Model` shape every other domain file in this module uses — and was renamed to
`PokemonModel` before merge for the same reason.

**Consequences.** `toDomain()` is a plain function (`pokemonDetailToDomain`,
`pokemonListItemToDomain`) applied explicitly to the parsed response inside the repository,
with no class standing in for data no code instantiates. `PokemonRepository` lives under
`domain/repository/`, not `application/`; see "Move project-owned ports from application to
domain" below for why. The list-entry domain model is `PokemonModel`, matching
`PokemonDetailModel`'s naming. Unit tests cover both mapper functions and the
`getAllPokemonDetailsUseCase` orchestration with a faked repository, per the testing standard.
Response-shape validation remains absent by design, as `docs/decisions.md`'s first entry
already scopes that to its own pull request.

**Lesson.** A `toDomain()` method only does something if a real instance calls it — typing an
HTTP client's response as a class is not the same as constructing that class, and nothing in
the type system catches the difference. This mistake was caught before merge, which is also
why it leaves no trace for anyone diffing this change against `main`: writing it down here is
the only record that it happened at all.

## Move project-owned ports from application to domain

**Decision.** Amends "Evolve towards domain, application, infrastructure, and UI boundaries":
project-owned ports (such as `PokemonRepository`) belong to domain, not application.
`docs/architecture.md` is updated to match — infrastructure implements ports domain defines;
application coordinates domain concepts through them but no longer owns them.

**Context.** Each feature under `src/` is meant to work as an independent module that other
features could eventually depend on. Application already depends directly on infrastructure
implementations inside a feature — the composition root that would remove that dependency is
deliberately deferred — which makes application the least stable part of a feature, not the
part another feature should couple to. A port owned by application would also mean one
feature's domain could only reach a sibling feature's capability by importing that sibling's
application layer: application is supposed to depend on domain, so a peer feature depending
on it instead reverses the intended direction between modules, not just within one.

**Consequences.** `docs/architecture.md`'s diagram and bullets now say infrastructure
implements ports owned by domain. Application keeps its own boundary — it still owns use
cases and is still what UI calls — this only narrows what it owns. No pull request yet
exercises a real cross-feature dependency, so this is a preventive alignment rather than a
fix for an observed break; the Pokémon feature ("Give the Pokémon feature domain,
application, infrastructure, and UI folders") is the first to apply it.

**Lesson.** The boundary other modules are meant to depend on should itself depend on as
little as possible. A layer that is already allowed to reach into concrete infrastructure
disqualifies itself from being that boundary, whatever else recommends it.

## Name every layer subfolder in the singular

**Decision.** Layer subfolders are always singular — `model/`, `repository/` — regardless of
how many files end up inside.

**Context.** While building this pull request, `src/pokemon/`'s subfolders were initially
plural because English pluralizes a folder holding several files of one kind. That reads
fine until a folder happens to hold exactly one file, at which point "models/" for one file
looks like a naming mistake, and nothing about the folder's role explains why. Counting files
to decide the name creates a question — is one enough to justify the plural? — that has no
principled answer and would recur every time a new feature's layer starts small. The folders
were renamed to singular before merge, so `main` never saw the plural form; only this
decision and the final singular layout are visible in history.

**Consequences.** The folder name states what kind of thing lives there, not how many
happen to right now. `docs/module-structure.md`'s example and every naming rule that
referenced a plural folder are updated to match.

**Lesson.** A naming rule that depends on counting the files it names isn't a rule, it's a
question you'll answer differently every time. Name the category, not the count.

## Give the Weather feature domain, application, infrastructure, and UI folders

**Decision.** `src/weather/` is split the same way as Pokémon: `domain/model/` +
`domain/repository/` (a single `ForecastRepository` port exposing `getCoordinates` and
`getForecast` — one port, not two, because nothing in this app needs geocoding without a
forecast to attach it to), `application/` (`getForecastUseCase`, combining both calls),
`infrastructure/model/` + `infrastructure/repository/` (`ForecastApiRepository`), and `ui/`.
`LocatedForecastModel` extends `ForecastModel` rather than repeating its fields, adding only
`location`, `country`, `latitude`, and `longitude` — it is a forecast with where it's for
attached, not an unrelated combined shape, and naming it that way (instead of, say,
`CurrentWeatherModel`) keeps it accurate if the app later shows a forecast for a time other
than now.

**Context.** The original `App.tsx` ran geocoding and forecast as two chained `useEffect`s,
each with its own request, state, and error handling, entirely inside the component. A
minimum city-name length (2 characters) was added so typing a single character doesn't
trigger a search; debounce and request cancellation are known gaps, tracked in the first
entry of this log, not fixed here.

**Consequences.** `getForecastUseCase` is the only place that knows fetching weather takes
two calls; `WeatherPage.tsx` calls one function and reads one result. Infrastructure models
(`GeocodingDataModel`, `ForecastDataModel`) are classes with a constructor nothing calls and
a duplicate `IXDataModel`-shaped parameter interface, unlike Pokémon's plain-interface
pattern — deliberately, because that constructor is the shape `class-transformer` adoption
([issue #19](https://github.com/Mikode13/slop-lab/issues/19)) will put to use as a real
`toDomain()` instance method. Until then, mapping goes through the free `toDomain` function
exactly as Pokémon's does; see `docs/module-structure.md` for why both interim shapes exist
side by side.

**Lesson.** A combined type earns an "extends" relationship when it really is the base
concept plus more, and a name change when the base concept doesn't cover what changed. Both
questions have real answers per case — neither was a coin flip here.

## Let application construct infrastructure directly until the composition root lands

**Decision.** `getAllPokemonDetailsUseCase` and `getForecastUseCase` each construct their own
concrete repository inline (`new PokemonApiRepository()`, `new ForecastApiRepository()`)
rather than receiving one. This is a known violation of the dependency direction
`docs/architecture.md`'s intended evolution describes — application is meant to depend on the
ports domain defines, not reach into a specific infrastructure implementation — accepted as
temporary rather than fixed now.

**Context.** Removing it properly needs something to do the constructing instead: a
composition root, almost certainly backed by a DI library (`inversify`, matching
vivolt.front). That is a bigger, cross-cutting change in its own right and is out of scope
for the two pull requests that introduced these use cases. Leaving the inline construction in
place kept each of those pull requests to the one problem it was demonstrating, at the cost of
landing with a boundary the architecture document already says shouldn't exist.

**Consequences.** Tracked as [issue #18](https://github.com/Mikode13/slop-lab/issues/18) for
both features together, since it's one fix applied twice, not two separate ones. Nothing in
the repository currently catches this kind of violation automatically — enforcing the layer
boundary with a lint rule (e.g. import restrictions between `application/` and
`infrastructure/`) is a real option, but a separate decision from introducing the composition
root itself, and is not proposed here.

**Lesson.** A documented target architecture and the code can disagree in a way `pnpm run
check` won't catch, because nothing but a reader (or a lint rule nobody has written yet)
currently checks a layer only imports what it's allowed to. Writing that gap down keeps it
visible until something fixes or enforces it.

## Close part of the testing-standard deviation this branch's own tests exposed

**Decision.** Amends "Initialize without the testing standard": the `test` and `test:unit`
scripts, the `tests/unit/` suite, and `.husky/pre-push` running `pnpm run check && pnpm test`
are no longer deviations — they were introduced while writing this pull request's own unit
tests for the Pokémon and Weather use cases and mappers. CI's Tests capability is enabled for
the first time in this change too, so the suite that `pre-push` already ran locally now also
runs on every pull request and on `main`. `component/`, `integration/`, and `external/`
remain unopened; the standard is partially adopted, not fully.

**Context.** This pull request needed unit tests for its new use cases and mappers regardless
of the testing standard's own timeline, and having written them, running them only through a
hook a push can bypass — or never, on a merge from the web UI — protected nobody but whoever
remembered to push normally. The AI review on this same pull request caught exactly that gap,
independent of the pull request's own goal of introducing layered features, and a related one:
`tests/tsconfig.json` existed but nothing invoked it, so a type error inside a test file
passed `pnpm run check` unnoticed. `tsc -p tests/tsconfig.json --noEmit` is now chained into
`pnpm run typecheck`.

**Consequences.** `README.md`'s "current status" section and command table now describe
`pnpm test` and the Tests capability instead of stating neither exists.

**Lesson.** A deviation recorded as "will close in its own pull request" can close as a side
effect of unrelated work instead. The record should say so once it happens rather than leave
the original entry looking still-open when it isn't.

## Import from `src/` through a single `@/` alias

**Decision.** `@/*` resolves to `src/*` everywhere: `vite.config.js` and `vitest.config.ts`
declare `resolve.alias`, and `tsconfig.json` and `tests/tsconfig.json` declare `paths`. Every
import that would leave its own folder (`../`) uses the alias; imports inside the same folder
stay relative. No import carries a file extension, and `tests/tsconfig.json` now uses
`module: esnext` with `moduleResolution: bundler`, like the root configuration.

**Context.** Tests reached `src/` through paths like
`../../../../../src/pokemon/infrastructure/model/pokemonDataModel.js`, which are hard to read
and change whenever a file moves. One generic alias scales to new features without touching
configuration, unlike one alias per feature ([issue #17](https://github.com/Mikode13/slop-lab/issues/17)).
The `.js` suffix on every specifier existed only because `tests/tsconfig.json` inherited
`nodenext` from the shared Node configuration, which rejects extensionless specifiers. The
tests run under Vitest, which resolves like a bundler, so `nodenext` was checking a
resolution model nothing executes.

**Consequences.** Four files must agree, and a partial change breaks one runtime silently:
Vitest projects do not inherit `resolve` unless they set `extends: true`, and the root
`tsconfig.json` and `tests/tsconfig.json` need their own `paths` (the latter points at
`../src/*`). `src/` is no longer written to be valid under `nodenext`; nothing compiles it
that way.

**Lesson.** A type-check configuration should model the resolution that actually runs the
code. Inheriting a stricter model made every import in `src/` pay for a runtime that does not
exist here.

## Build infrastructure data models with class-transformer

**Decision.** Every infrastructure data model is a class that implements `DataModel<T>`
(`toDomain(): T`, in `src/common/domain/dataModel.ts`), declares its fields with
`@Expose` and `@Type`, and is built by `fromJson(Model, json)`
(`src/common/infrastructure/fromJson.ts`), a thin wrapper over `plainToInstance` with
`excludeExtraneousValues`. The contract is domain-side because it names no library; the
wrapper and the decorated models are infrastructure because they depend on `class-transformer`.
The models use its decorators and the wrapper only owns the construction call, so replacing
the library touches every data model, not one file. Repositories call
`fromJson(...).toDomain()`. This replaces both shapes the two features used: Pokémon's plain
interfaces with free `toDomain` functions, and Weather's classes with an unused constructor
and a duplicate `IXDataModel` interface. The domain models keep their own constructors.

**Context.** Amends "Give the Weather feature domain, application, infrastructure, and UI
folders", which recorded Weather's classes as an interim shape, and the Pokémon entry's
free-function mappers ([issue #19](https://github.com/Mikode13/slop-lab/issues/19)). The
mappers existed because a class typed onto an axios response is never instantiated, so its
`toDomain()` threw. `plainToInstance` is what actually constructs the instance, which makes
the method safe again while removing the `this.x = x` constructors and their duplicate
parameter interfaces. A spike first checked that decorators compile under tsc, Vitest, and
the Vite build.

**Consequences.** Both tsconfigs set `experimentalDecorators`, because `class-transformer`
uses the legacy decorator signature that TypeScript's standard decorators do not provide.
`reflect-metadata` becomes a dependency, imported once in `main.tsx` and in
`tests/setup.ts`: `@Type` calls `Reflect.getMetadata`, and without it every model fails at
load. Model tests now start from raw JSON and go through `fromJson`, so they cover the
decorators and the dropping of undeclared fields, not only the mapping. Both features were
also run against the real PokéAPI and Open-Meteo. Fields are still unvalidated at runtime:
a wrong type from the provider passes through unchanged, which
[issue #20](https://github.com/Mikode13/slop-lab/issues/20) covers.

**Lesson.** The earlier bug and its fix were the same fact seen from two sides: a method on
a data model works only if something constructs the instance. Putting that construction in
one named function (`fromJson`) makes it a single place to get right instead of a habit every
repository has to remember.

## Type domain constructors with ConstructorType instead of a duplicate interface

**Decision.** Domain model constructors take `ConstructorType<TheClass>`, defined in
`src/common/domain/constructorType.ts` as the class's own members with every function member
removed: methods, function-typed properties, and optional or nullable ones. The
`IForecastModel`/`IGeocodingModel` interfaces and the inline `{ id: number; ... }` parameter
types on the Pokémon and Weather models are gone. The assignments in each constructor stay.

**Context.** Each domain class listed its fields twice, once as members and once as the
constructor parameter type, so adding a field meant editing both and TypeScript only noticed
when they drifted. vivolt.front solves this with the same helper, but its version filters on
`T[K] extends Function`, which lets optional and nullable functions through as required
constructor data. The variant here uses `NonNullable<T[K]>` and `-?` to close that hole while
keeping optional data fields optional.

**Consequences.** Getters remain a gap: to the type system they are ordinary fields, so a
model with a getter has to omit it explicitly or turn it into a method. Neither feature has
one today. `LocatedForecastModel` keeps taking a base forecast plus a `Pick` of its own
fields, because spreading a class instance into the parameter loses its prototype and the
lint rule against it is right in general. The type is covered by a type-level test that
`tsc` checks under `tests/`. Infrastructure models are unaffected: they declare their fields
with decorators and take no constructor arguments.

**Lesson.** A helper copied from a reference project should be tested against the cases the
reference never hit. The original passed for every model vivolt.front had and would have
passed for ours too, yet it failed for a class with an optional callback.

## Wire use cases through factories and a composition root

**Decision.** Amends "Let application construct infrastructure directly until the composition
root lands", which recorded that violation as temporary. Each use case is now built by a
factory that takes the domain port it needs (`createGetForecastUseCase(repository)`) and returns
the use case function. `src/compositionRoot.ts` exports `createApplication()`, the only place
that constructs the infrastructure adapters and passes them to the factories. `main.tsx`
builds the application once and provides it through `ApplicationProvider`; the two feature
pages read their use case with `useApplication()`. No dependency-injection library is used
([issue #18](https://github.com/Mikode13/slop-lab/issues/18)).

**Context.** The use cases constructed their repository inline, so application imported
infrastructure and the tests could only isolate them by mocking a module path. The options
were a container such as `inversify`, as vivolt.front uses, or plain constructor injection.
A container adds a table of symbols that the compiler does not check, decorators inside the
application layer, and a dependency, to solve a wiring problem two features do not have.
Factories are checked end to end by the type system and keep application free of any
framework.

**Consequences.** Application no longer imports infrastructure, which the architecture
document had recorded as a known deviation. The reason the earlier entry
"Move project-owned ports from application to domain" gave for keeping ports in domain
(application depends on concrete infrastructure) no longer holds, so the architecture and
module-structure documents now rest it on application being the least stable contract for a
peer feature to depend on; that entry stays as written, as history. Use case tests pass a plain fake repository, so
the `vi.mock` of an adapter module and the dynamic import that followed it are gone, and a
new test covers that no forecast is requested when the city cannot be resolved. The context
also gives component tests a place to inject fakes ([issue #22](https://github.com/Mikode13/slop-lab/issues/22)).
The factory pattern makes a use case's file name differ from its exported name, which
`docs/module-structure.md` records as the single exception to the naming rule. A container
becomes worth revisiting if wiring by hand grows painful or per-use-case lazy loading is
needed; that would be a new decision.

Delivering the application through a React context is the one React-specific piece: the
factories, `createApplication()`, and the `Application` type import nothing from React, and
only `ApplicationProvider.tsx` does. It is accepted for now and is the first candidate to
extract into a shared library, with the framework-agnostic core separate from a per-framework
adapter.

**Lesson.** Dependency inversion needs a place that knows both sides, not a library. Passing
the port as an argument achieves the inversion, and the composition root is just the function
that does the passing.

## slop-lab calls the central AI reviewer as a canary

**Decision.** The reviewer's workflow, scripts, and tests leave this repository. This amends
"Pilot automated review locally before centralizing it", "Fail the review gate instead of
skipping it", and "Put the token and the check out of a branch's reach before the gate is required", which describe a local reviewer and a base revision that can lack one. A thin caller
runs `Mikode13/.github`'s reusable `ai-review.yml` at a full commit SHA, and slop-lab moves to a
newer SHA before other repositories do.

**Context.** The pilot was meant to end here: the reviewer was proven on real pull requests, and
each defect it exposed was fixed in a pull request the pilot itself reviewed. Live runs, the
layered-architecture migration among them, stopped exposing pipeline defects, so the
maintainer promoted it in Mikode13/.github#15.

**Consequences.** A reviewer change is a reviewed pull request in `Mikode13/.github`, then a new
SHA here, then the same in other repositories. The previous SHA is the rollback. The scripts'
tests no longer run in `pnpm run check`, which also removes a test runner from a command the
testing standard keeps free of them. The token stays in this repository's `ai-review`
environment, and whether the reusable workflow reads it is what the first pull request through
the caller shows.

**Lesson.** Pilot where every defect is cheap and reviewed, then centralize once the defects stop.

## Run central review actions from this repository's protected jobs

**Decision.** Amend "slop-lab calls the central AI reviewer as a canary": the caller now has
two local jobs, pinned to the same reviewed commit of `Mikode13/.github`. The read-only
analysis job declares this repository's `ai-review` environment and calls the central
analysis action with its credential. A separate publication job calls the central publication
action with write permissions and without the provider credential.

**Context.** The first canary run through the reusable workflow produced `Not logged in`:
the secret was present in this repository's protected environment, but the called analysis
job received an empty value. The earlier local pilot used the same secret successfully.

**Consequences.** `pull_request_target` still loads the caller from `main`, and only runs
from `main` can enter the protected environment. The pull request's files are read as
evidence, never executed. The central actions and reviewer scripts are still reviewed and
pinned by immutable SHA; all consumers must move both pins together. An unavailable
credential yields an explicit incomplete review and a failing status. No repository or
organization secret is needed. The next real canary run must confirm that the provider
authenticates through the local job before other repositories adopt this pattern.

**Lesson.** The repository that owns the protected secret should also own the job that
declares its environment, while central executable code stays pinned and shared.
