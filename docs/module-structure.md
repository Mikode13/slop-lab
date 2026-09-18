# Feature module structure

This shows the concrete folder layout and file-naming pattern for a feature module, worked
out on the Pokémon feature. It complements [architecture.md](architecture.md), which
defines the four boundaries (domain, application, infrastructure, UI) conceptually; this
document is the file-level and naming-level pattern that follows from them. The reasoning
behind each naming choice lives in [decisions.md](decisions.md) and is not repeated here.

`user` below is a placeholder module, not a real feature — copy the shape, not the name.

```text
user/
├── domain/
│   ├── model/
│   │   ├── detailModel.ts        → UserDetailModel
│   │   └── summaryModel.ts       → UserSummaryModel
│   └── repository/
│       └── userRepository.ts     → UserRepository (the port)
├── application/
│   └── useCase/
│       ├── getUserUseCase.ts     → getUserUseCase
│       └── getAllUsersUseCase.ts → getAllUsersUseCase
├── infrastructure/
│   ├── model/
│   │   ├── <provider>DetailModel.ts   → <Provider>DetailModel
│   │   └── <provider>SummaryModel.ts  → <Provider>SummaryModel
│   └── repository/
│       └── <provider>Repository.ts    → <Provider>Repository (implements UserRepository)
└── ui/
    └── UserPage.tsx   → WIP: components, state, and stores aren't decided yet
```

Replace `<provider>` / `<Provider>` with the concrete external system the adapter talks to
— `PokeApi`, `PokemonApi`, `LocalStorage`, `GitHubApi`, whatever reads clearly for that
feature. Never `Impl`: a generic "this is an implementation" suffix stops working the
moment a port has a second adapter, because it says nothing about which one. The provider
name always does. The exact spelling is a per-feature call, not a fixed vocabulary — it
does not have to match the external product's own brand name or abbreviation, it only has
to distinguish this adapter from any other adapter of the same port.

## Naming rules

- **Casing.** Files are named after their primary export, in that export's casing: PascalCase
  export → PascalCase file (React components only); everything else is camelCase. No
  snake_case, no kebab-case.
- **Folder names are always singular** (`model/`, `repository/`, `useCase/`), regardless of
  how many files end up inside. Counting files to decide singular vs plural just creates a
  question with no stable answer: a folder with one file today gets a second tomorrow, and
  nothing about the folder's role changed in between.
- **Domain is bare.** No qualifier: `UserDetailModel`, `UserRepository`. The folder
  (`domain/`) already says what it is; the name says only what it is a model or contract
  of, dropping the feature-name prefix the path already supplies.
- **Infrastructure is provider-qualified.** Every infrastructure model, repository
  implementation, or adapter is prefixed with the concrete provider it speaks to. This is
  the only thing that distinguishes an infra name from a domain name at a glance, and it
  scales to any number of adapters for the same port without inventing new vocabulary each
  time (`PokeApiRepository`, `LocalStorageRepository`, ... all implement `UserRepository`).
- **Ports live in domain, not `application/`.** A port is the stable contract other features
  would depend on if they needed this module's capability; application already depends on
  concrete infrastructure ahead of the composition root, so it is not the stable boundary.
  See the "Move project-owned ports from application to domain" entry in decisions.md.
- **Name the port's folder concretely, not `interfaces/`.** `interfaces/` says nothing about
  what kind of contract is inside, and a domain can define more than one kind: a
  `repository/` (data access, this document's example) reads differently from, say, a
  `sender/` port that only exposes `resetPassword`/`confirmEmail` and makes no claim about
  CRUD or an external API at all. Name each port folder after what it actually is; don't
  invent a catch-all bucket before a second kind of port exists to justify one.
- **Shared infra shapes are owned by whoever defines them, not duplicated by resemblance.**
  If a second adapter (e.g. a `LocalStorage` cache) persists another adapter's shape
  unchanged, it reuses that adapter's model instead of declaring a lookalike one. Two
  models that only coincidentally match today, but could change for unrelated reasons,
  stay separate even though they look identical right now.
- **Use cases are a verb plus what they do, suffixed `UseCase`:** `getUserUseCase`,
  `createUserUseCase`, `deleteUserUseCase`.
- **Subdivide a layer's folder only once it holds more than one kind of artifact.** `domain/`
  stays flat until it has something besides models (like a repository port); `application/`
  today only ever holds `useCase/`, so it isn't subdivided further. Don't create an empty
  category folder in anticipation of a file that doesn't exist yet.
- **A shared `DataModel<T>` contract for infrastructure is planned, not yet adopted.** Every
  infrastructure model would implement `toDomain(): T`, enforced by a common interface
  (mirrors vivolt.front's own `DataModel<T>`), with the repository constructing the class
  explicitly (`new XDataModel(raw).toDomain()`) rather than trusting a generic type
  parameter to have done it. Today's infrastructure models stay as plain interfaces with a
  free `toDomain` function instead — less to write while the project is this small, and a
  contained, additive change to switch over once `class-transformer` adoption (see
  decisions.md) makes the constructor boilerplate this would otherwise add worth removing
  at the same time.
