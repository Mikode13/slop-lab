# slop-lab

A small React application that reads two public HTTP APIs: a current-weather lookup and a
paginated Pokémon browser. It exists as teaching material, not as a product.

## Why this repository exists

The application code in `src/` is written the way a code generator writes code when nobody
constrains it: HTTP calls inside components, hand-written response types that are never
validated, duplicated request logic, no cancellation, and no tests. That starting point is
deliberate.

Each pull request then fixes one problem, and records what the change bought us in
[docs/decisions.md](docs/decisions.md). The repository is therefore readable in two ways:
as a working application at its current state, and as a sequence of reviewable refactors
from generated code towards the MiKode engineering standards.

[The architecture document](docs/architecture.md) describes both the deliberately flat
current implementation and the explicit boundaries the teaching sequence will introduce.

The repository scaffold follows those standards from the first commit. The application code
does not yet. Everything in `src/` passes formatting, linting, and type checking while
remaining badly designed, which is the first thing the project demonstrates.

## Current status

Working: the weather panel, the Pokémon list with pagination, and the production build.

Partially adopted:

- the [testing standard](https://github.com/Mikode13/engineering/blob/main/standards/testing.md);
  `tests/unit/` covers the layered Pokémon and Weather features with a `test` script and a
  Tests capability in CI, but `component/`, `integration/`, and `external/` are not started
  yet. See [docs/decisions.md](docs/decisions.md).

## Requirements

- Node.js `^22.13.0 || ^24.0.0` (`.nvmrc` pins the development version)
- pnpm 11.17.0, which the `packageManager` field selects automatically

## Getting started

```sh
pnpm install
pnpm dev
```

The development server prints its local URL. Both APIs are public and need no credentials,
so a network connection is the only external requirement.

## Commands

| Command                   | Purpose                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `pnpm dev`                | Start the Vite development server                                   |
| `pnpm build`              | Produce the production build in `dist/`                             |
| `pnpm preview`            | Serve the production build locally                                  |
| `pnpm run check`          | Formatting, linting, type checking, and the AI review pilot's tests |
| `pnpm test`               | The unit suite under `tests/unit/`                                  |
| `pnpm run test:ai-review` | Only the AI review pilot's tests                                    |
| `pnpm run format`         | Rewrite files with Prettier                                         |
| `pnpm run lint:fix`       | Apply the ESLint fixes that can be applied safely                   |

`pnpm run check` and `pnpm test` are what CI and the `pre-push` hook both run, as separate
steps. The AI review pilot's tests cover its temporary tooling, not the application.

The repository also hosts a temporary
[AI review pilot](docs/ai-review-pilot.md). It is evaluated separately from deterministic
CI and will become a thin caller after the workflow is proven and promoted to
`Mikode13/.github`.

## External APIs

- [Open-Meteo](https://open-meteo.com/en/docs) for current weather and its geocoding search.
- [PokéAPI](https://pokeapi.co/docs/v2) for the paginated list and the per-entry details.

Neither service is affiliated with this project. Both are used within their documented
public rate limits.

## License

Source-available under the MIT License with the Commons Clause License Condition v1.0. The
Commons Clause removes the right to sell the software. See [LICENSE](LICENSE) for the
complete terms.
