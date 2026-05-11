# @huuma/inject

A simple and lightweight dependency injection container for Deno. Straightforward to use and suitable for a wide range of use cases — from registering plain values, to wiring up classes with nested dependencies, to using decorators for automatic registration.

## Installation

### Deno

```sh
deno add jsr:@huuma/inject
```

Or import directly without adding it to `deno.json`:

```ts
import { Factory, inject } from "jsr:@huuma/inject";
```

### Node.js

Install via your package manager using the JSR compatibility layer:

```sh
# npm
npx jsr add @huuma/inject

# pnpm
pnpm dlx jsr add @huuma/inject

# yarn
yarn dlx jsr add @huuma/inject

# bun
bunx jsr add @huuma/inject
```

Then import it like any other package:

```ts
import { Factory, inject } from "@huuma/inject";
```

## Quick start

```ts
import { Factory } from "jsr:@huuma/inject";

const DI = new Factory();

class GreetingService {
  greet(value: string) {
    return value;
  }
}

DI.inject({ class: GreetingService });

DI.get(GreetingService).greet("hello");
```

## Usage

### Inject a value

Register a value under a string token and retrieve it by that token.

```ts
const DI = new Factory();

DI.inject({ token: "HELLO", value: "world" });

DI.get("HELLO"); // "world"
```

### Inject a class

Register a class. By default, classes are treated as singletons.

```ts
class Hello {
  say() {
    return "world";
  }
}

const DI = new Factory();
DI.inject({ class: Hello });

DI.get(Hello).say(); // "world"
```

### Non-singleton classes

Set `isSingleton: false` to get a new instance on every `get` call.

```ts
DI.inject({
  class: Hello,
  isSingleton: false,
});

const a = DI.get(Hello);
const b = DI.get(Hello);
// a !== b
```

### Class with dependencies

Constructor dependencies are passed via `dependencies`, in the same order as the constructor parameters. Dependencies can be string tokens, classes, or functions.

```ts
const DI = new Factory();

DI.inject({ token: "value", value: "univers" });

class Hello2 {
  constructor(private readonly value: string) {}
  say() {
    return this.value;
  }
}

DI.inject({
  class: Hello2,
  dependencies: ["value"],
});

DI.get(Hello2).say(); // "univers"
```

### Nested class dependencies

Classes can depend on other classes — the factory resolves the whole graph.

```ts
const DI = new Factory();

DI.inject({ token: "newValue", value: "galaxy" });

class HelloService {
  constructor(private readonly value: string) {}
  say() {
    return this.value;
  }
}
DI.inject({ class: HelloService, dependencies: ["newValue"] });

class Hello3 {
  constructor(private readonly helloService: HelloService) {}
  say() {
    return this.helloService.say();
  }
}
DI.inject({ class: Hello3, dependencies: [HelloService] });

DI.get(Hello3).say(); // "galaxy"
```

### Inject a function

Pure functions can be registered too. Calling `get` with the function reference invokes it with the resolved dependencies.

```ts
const DI = new Factory();

DI.inject({ token: "hey", value: "ho" });

function say(hello: string) {
  return hello;
}

DI.inject({ function: say, dependencies: ["hey"] });

DI.get(say); // "ho"
```

### Using the `@inject` decorator

The `@inject` decorator attaches dependency metadata to a class so it can be resolved without a separate `inject(...)` call for the class itself.

```ts
import { Factory, inject } from "jsr:@huuma/inject";

@inject()
class B {
  prefix(v: string): string {
    return `B: ${v}`;
  }
}

@inject({ deps: [B, "PREFIX"] })
class A {
  constructor(
    private prefixer: B,
    private prefixValue: string,
  ) {}

  prefix(v: string): string {
    return this.prefixer.prefix(`${this.prefixValue} ${v}`);
  }
}

const DI = new Factory();

DI.inject({ token: "PREFIX", value: "prefixed value:" });

DI.get(B).prefix("works"); // "B: works"
DI.get(A).prefix("works"); // "B: prefixed value: works"
```

## API

### `class Factory`

- `inject(toInject)` — register a class, function, or value with the container.
- `get(token)` — resolve and return the instance/value associated with the token.

### `ToInject<T>`

One of:

- `ClassToInject<T>`: `{ class, isSingleton?, dependencies? }`
- `FunctionToInject<T>`: `{ function, dependencies? }`
- `ValueToInject<T>`: `{ token, value }`

### `inject(options?)`

Class decorator that records dependency metadata on the class. Use `options.deps` to declare constructor dependencies.

## License

See repository for license information.
