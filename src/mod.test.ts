import { expect, test } from "vite-plus/test";
import { Factory, inject } from "./mod.ts";

test("should return a expected value", () => {
  const DI = new Factory();

  DI.inject({
    token: "hello",
    value: "world",
  });

  expect(DI.get("hello")).toBe("world");
});

test("should return valid class instance", () => {
  class Hello {
    say() {
      return "world";
    }
  }
  const DI = new Factory();
  DI.inject({
    class: Hello,
  });

  expect(DI.get(Hello).say()).toBe("world");
});

test("should return singleton class instance", () => {
  class Hello {
    say() {
      return "world";
    }
  }
  const DI = new Factory();
  DI.inject({
    class: Hello,
  });

  const a = DI.get(Hello);
  const b = DI.get(Hello);

  expect(a).toBe(b);

  expect(a.say()).toBe("world");
  expect(b.say()).toBe("world");
});

test("should return own class instance", () => {
  class Hello {
    say() {
      return "world";
    }
  }
  const DI = new Factory();
  DI.inject({
    class: Hello,
    isSingleton: false,
  });

  const a = DI.get(Hello);
  const b = DI.get(Hello);

  expect(a).not.toBe(b);

  expect(a.say()).toBe("world");
  expect(b.say()).toBe("world");
});

test("should return valid class instance with deps", () => {
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
    isSingleton: true,
    dependencies: ["value"],
  });

  expect(DI.get(Hello2).say()).toBe("univers");
});

test("should return valid class instance with nested deps", () => {
  const DI = new Factory();
  DI.inject({
    token: "newValue",
    value: "galaxy",
  });
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
  DI.inject({
    class: Hello3,
    dependencies: [HelloService],
  });

  expect(DI.get(Hello3).say()).toBe("galaxy");
});

test("should return function result based on deps", () => {
  const DI = new Factory();
  DI.inject({
    token: "hey",
    value: "ho",
  });

  function say(hello: string) {
    return hello;
  }

  DI.inject({ function: say, dependencies: ["hey"] });

  expect(DI.get(say)).toBe("ho");
});

/**
 * The Node test runtime cannot parse TC39 decorator syntax and oxc only
 * lowers legacy decorators, so the decorator is applied the way a class
 * definition would perform it: the decorator is invoked with an engine-side
 * context, and the context metadata is mirrored onto the class through
 * `Symbol.metadata` exactly as the decorator metadata proposal prescribes.
 */
function applyInject(
  target: abstract new (...args: never[]) => object,
  name: string,
  options?: { deps?: unknown[] },
): void {
  const metadata: Record<PropertyKey, unknown> = {};
  inject(options)(target, { kind: "class", name, metadata, addInitializer: () => {} });
  Object.defineProperty(target, Symbol.metadata, { value: metadata });
}

test("should return decorated class with deps", () => {
  class B {
    prefix(v: string): string {
      return `B: ${v}`;
    }
  }
  applyInject(B, "B");

  class A {
    constructor(
      private prefixer: B,
      private prefixValue: string,
    ) {}

    prefix(v: string): string {
      return this.prefixer.prefix(`${this.prefixValue} ${v}`);
    }
  }
  applyInject(A, "A", {
    deps: [B, "PREFIX"],
  });

  const DI = new Factory();

  DI.inject({
    token: "PREFIX",
    value: "prefixed value:",
  });

  expect(DI.get(B).prefix("works")).toBe("B: works");
  expect(DI.get(A).prefix("works")).toBe("B: prefixed value: works");
});
