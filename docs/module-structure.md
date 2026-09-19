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
│   │   ├── userDetailModel.ts    → UserDetailModel
│   │   └── userSummaryModel.ts   → UserSummaryModel
│   └── repository/
│       └── userRepository.ts     → UserRepository (the port)
├── application/
│   ├── getUserUseCase.ts     → getUserUseCase
│   └── getAllUsersUseCase.ts → getAllUsersUseCase
├── infrastructure/
│   ├── model/
│   │   ├── userDetailDataModel.ts    → UserDetailDataModel
│   │   └── userSummaryDataModel.ts   → UserSummaryDataModel
│   └── repository/
│       └── <provider>Repository.ts   → <Provider>Repository (implements UserRepository)
└── ui/
    └── UserPage.tsx   → WIP: components, state, and stores aren't decided yet
```

Replace `<provider>` / `<Provider>` in the repository file name with the concrete external
system the adapter talks to — `PokeApi`, `PokemonApi`, `LocalStorage`, `GitHubApi`, whatever
reads clearly for that feature. Never `Impl`: a generic "this is an implementation" suffix
stops working the moment a port has a second adapter, because it says nothing about which
one. The provider name always does. The exact spelling is a per-feature call, not a fixed
vocabulary — it does not have to match the external product's own brand name or abbreviation,
it only has to distinguish this adapter from any other adapter of the same port. Infra
models don't take this qualifier; see the naming rule below for why.

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
- **Infrastructure repositories are provider-qualified; infrastructure models aren't.** A
  repository implementation is prefixed with the concrete provider it speaks to
  (`PokemonApiRepository`, `LocalStorageRepository`, ... all implementing the same port),
  because that's the one thing that actually varies once a port gets a second adapter, and a
  generic `Impl` suffix stops distinguishing them the moment it does. An infrastructure model
  instead mirrors its domain counterpart's name with `Data` inserted before `Model`
  (`PokemonDetailModel` → `PokemonDetailDataModel`, `ForecastModel` → `ForecastDataModel`): it
  belongs to whichever single provider its feature's repository already commits to, so
  restating that provider on every model inside `infrastructure/model/` would only repeat
  what the folder already says.
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
- **Subdivide a layer's folder only once it holds more than one kind of artifact.**
  `application/` holds only use case files today, in both features that exist, so it stays
  flat — a `useCase/` subfolder would separate use cases from nothing, since there is nothing
  else in `application/` to separate them from. `domain/` earns its `model/` and `repository/`
  split because it already holds two kinds of artifact. Don't create a category folder in
  anticipation of a second kind that doesn't exist yet; add it when application actually
  gains one.
- **Infrastructure models implement `DataModel<T>` and are built with `fromJson`.** Each one
  is a class whose fields carry `@Expose` (and `@Type` for nested objects) and that
  implements `toDomain(): T` from the `DataModel<T>` contract in
  `src/common/domain/dataModel.ts`, which belongs to the project's domain because it says
  nothing about how data is fetched. `fromJson` lives in `src/common/infrastructure/fromJson.ts`
  because it is the construction call built on `class-transformer`, whose
  decorators the models themselves also use. The repository
  builds it explicitly, `fromJson(XDataModel, response.data).toDomain()`, never by typing an
  HTTP response as the class: `axios.get<T>()` only asserts a type at compile time and never
  constructs an instance. `fromJson` uses `excludeExtraneousValues`, so a field the model
  does not declare is dropped instead of copied. The fields keep the provider's own names
  (`temperature_2m`); renaming happens in `toDomain()`. Decorators need
  `experimentalDecorators` in both tsconfigs and `reflect-metadata` imported once at the
  entry point and in the Vitest setup file.
- **Domain model constructors take `ConstructorType<Self>`.** A domain class declares its
  fields once and its constructor parameter is `ConstructorType<TheClass>`
  (`src/common/domain/constructorType.ts`): the class's own members minus every function, so
  there is no separate `IForecastModel` interface repeating the field list. Getters are the
  one gap, because TypeScript cannot tell a getter from a field; omit them by hand
  (`Omit<ConstructorType<X>, 'total'>`) or make them methods. A subclass that adds fields to
  an existing model (`LocatedForecastModel`) takes the base instance plus a `Pick` of its own
  additions rather than spreading the instance, which loses its prototype.
