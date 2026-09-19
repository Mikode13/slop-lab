# slop-lab architecture

This document describes the application's current architecture and the boundaries it is
intended to demonstrate as the repository evolves. Each architectural problem is addressed in
its own reviewable pull request, so parts of the design are adopted and parts are still
planned; the sections below say which is which.

## Purpose and scope

slop-lab is a browser-only React application with two independent features: current weather
lookup and paginated Pokémon browsing. It is teaching material for comparing a working but
poorly separated starting point with later, focused refactors.

The project owns the browser application, its presentation logic, and its integration with
Open-Meteo and PokéAPI. It does not own either external API or a server-side component.

## Current architectural shape

Both features are split into domain, application, infrastructure, and UI layers under
`src/pokemon/` and `src/weather/`. The two features are independent: nothing under `src/` is
shared between them. [module-structure.md](module-structure.md) gives the file-level layout
and naming rules.

```mermaid
flowchart LR
    Main[main.tsx] --> Composition[compositionRoot.ts]
    Main --> Provider[ApplicationProvider.tsx]
    Main --> App[App.tsx]
    Composition --> WeatherApp[weather/application]
    Composition --> PokemonApp[pokemon/application]
    Composition --> WeatherInfra[weather/infrastructure]
    Composition --> PokemonInfra[pokemon/infrastructure]
    App --> WeatherUI[weather/ui]
    App --> PokemonUI[pokemon/ui]
    WeatherUI --> Provider
    PokemonUI --> Provider
    Provider -.-> WeatherApp
    Provider -.-> PokemonApp
    WeatherApp --> WeatherDomain[weather/domain]
    PokemonApp --> PokemonDomain[pokemon/domain]
    WeatherInfra --> WeatherDomain
    PokemonInfra --> PokemonDomain
    WeatherInfra --> Axios[axios]
    PokemonInfra --> Axios
    Axios --> OpenMeteo[Open-Meteo APIs]
    Axios --> PokeAPI[PokéAPI]
```

`main.tsx` is the browser entry point. It calls `createApplication()` in
`src/compositionRoot.ts`, the only place that knows both a use case and the concrete
repository it runs on, and hands the result to the UI through `ApplicationProvider`. `App.tsx`
owns tab selection and renders one feature's UI at a time; it holds no feature logic. UI
components reach their use case with `useApplication()`, so they depend on the use case's
shape and never on how it was built.

## Current responsibilities and boundaries

- `main.tsx` locates the DOM root, builds the application through the composition root, and
  mounts React.
- `App.tsx` renders application navigation and switches between the two feature panels.
- **Domain** owns business concepts and the ports through which a feature reaches
  infrastructure, without React, Axios, or provider response types. The ports live here, not
  in application, because domain is the stable boundary a feature exposes: other features
  that eventually depend on it should point at domain, not at application, whose use cases
  orchestrate one feature's flows and change with them.
- **Application** owns each feature's use cases. A use case is built by a factory that takes
  the domain port it needs (`createGetForecastUseCase(repository)`), so it never constructs
  infrastructure itself. It is the boundary through which UI obtains domain results.
- The **composition root** (`src/compositionRoot.ts`) constructs the infrastructure adapters
  and passes them to the use case factories.
- **`ApplicationProvider.tsx`** is the one React-specific piece of the wiring: a context that
  delivers the built application to the UI, read with `useApplication()`. It holds no logic
  of its own; the composition root and the factories it carries import nothing from React.
- **Infrastructure** contains the HTTP adapters (`ForecastApiRepository`,
  `PokemonApiRepository`), the provider response shapes, and their mapping into domain
  models. It implements the domain-owned ports.
- **UI** (`WeatherPage.tsx`, `PokemonBrowser.tsx`) contains React rendering and interaction
  state and invokes application use cases rather than HTTP clients.
- `styles.css` supplies global presentation styles; most component styling remains inline.
- Open-Meteo and PokéAPI are public external systems reached only from infrastructure.

## Current dependencies and contracts

React and the browser DOM form the runtime UI platform. Dependency direction is inward: UI
depends on application, and application and infrastructure both depend on domain, including
the ports domain defines. Infrastructure implements those ports and does not depend on
application. Domain does not depend on React, Axios, infrastructure, or application. UI and
domain communicate through application use cases rather than depending on one another
directly.

Application does not depend on infrastructure: use case factories receive their repository
as an argument, and only the composition root imports both sides. Infrastructure builds its
data models with `class-transformer`, which declares the fields it reads but does not validate
their types, so external responses, failed requests, request timing, and cancellation can
still affect UI state directly.

## Important flows

For weather, changing the city calls `getForecastUseCase`, which geocodes the city, requests
its current conditions, and returns one located forecast for `WeatherPage` to render. Below a
minimum city-name length no search runs and the panel shows a prompt instead of a forecast.

For Pokémon, changing the offset calls `getAllPokemonDetailsUseCase`, which requests a page
from PokéAPI and then requests every listed Pokémon's detail concurrently. Filtering is
performed in memory over the current page in `PokemonBrowser.tsx`.

## Intended evolution

The four boundaries and the composition root are adopted for both features. What remains is
validating provider responses at the infrastructure boundary
([issue #20](https://github.com/Mikode13/slop-lab/issues/20)). Until it lands, reviewers should
report the missing validation as known material rather than claim an unrelated change caused it.

## Constraints and trade-offs

- Architectural improvements must remain small enough for each pull request to demonstrate
  one problem and the value of its fix.
- Known missing validation, request cancellation, error states, shared request logic, and
  tests beyond the unit boundary are deliberate starting conditions and must not be repaired
  opportunistically.
- The application remains browser-only unless a later project decision explicitly adds a
  server-side responsibility.
- The intended layers should contain meaningful policy or integration boundaries. Empty
  folders and pass-through abstractions would hide rather than teach the design.
