/**
 * With Huuma Inject you get a simple and light dependency injection container
 * for your project. Its straight forward to use and is suitable for simple use
 * cases like the following:
 *
 * ```ts
 * import { Factory } from "jsr:@huuma/inject";
 *
 * const DI = new Factory();
 *
 * class GreetingService {
 *    greet(value string) {
 *      return value;
 *    }
 * }
 * DI.assemble({
 *   class: GreetingService
 * });
 *
 * DI.get(GreetingService);
 * ```
 * @module
 */

// deno-lint-ignore no-explicit-any
export type Callable<T> = (...args: any[]) => T;

type ItemToInject = ToInject<unknown> & {
  type: Injectable;
  value?: unknown;
};

type Newable<T> = {
  // deno-lint-ignore no-explicit-any
  new (...args: any[]): T;
};

type Injectable = string | Newable<unknown> | Callable<unknown>;

/**
 *  Input for {@link Factory.inject} to register a class
 */
export interface ClassToInject<T> {
  /** The class to be constructed by {@link Factory.inject} */
  class: Newable<T>;
  /**
   * Whether of not the class should be handled as a singleton instance (e.q. only exists once).
   * @default true
   */
  isSingleton?: boolean;
  /**
   * The dependencies of the class as {@link Injectable[]} tokens
   */
  dependencies?: Injectable[];
}

/**
 *  Input for {@link Factory.inject} to register a token based value
 */
export interface ValueToInject<T> {
  token: string;
  value: T;
}

/**
 *  Input for {@link Factory.inject} to register a pure function
 */
export interface FunctionToInject<T> {
  function: Callable<T>;
  dependencies?: Injectable[];
}

/**
 * Allowed input types for the {@link Factory.inject} function
 *  Types: {@link ClassToInject},{@link ValueToInject},{@link FunctionToInject}
 */
export type ToInject<T> =
  | ClassToInject<T>
  | FunctionToInject<T>
  | ValueToInject<T>;

type ReturnValue<A extends Injectable, T> = A extends string
  ? ValueToInject<T>["value"]
  // deno-lint-ignore no-explicit-any
  : A extends (...args: any) => any ? ReturnType<A>
  // deno-lint-ignore no-explicit-any
  : A extends new (...args: any[]) => infer R ? R
  : never;

/**
 * Factory to manage the dependency injection tasks
 * @class
 */
export class Factory {
  #registry: ItemToInject[] = [];
  #singletons = new Map<Injectable, unknown>();

  /**
   * Retrieve an instance of the requested injection token {@link Injectable}.
   * @method
   * @param {Injectable}
   */
  get<T, A extends Injectable = string>(token: A): ReturnValue<A, T> {
    let injectable = this.#registry.find((item) => {
      return item.type === token;
    });

    const errMsg =
      `Provided token: "${token.toString()}" is not registered for dependency injection`;

    if (!injectable) {
      if (
        typeof token === "function" &&
        Symbol.metadata in token &&
        token[Symbol.metadata] &&
        Array.isArray(token[Symbol.metadata]![INJECT_METADATA_KEY])
      ) {
        const dependencies = <Injectable[]> (
          token[Symbol.metadata]![INJECT_METADATA_KEY]
        );
        this.inject({ class: <Newable<unknown>> token, dependencies });
      }
      injectable = this.#registry.find((item) => {
        return item.type === token;
      });
      if (!injectable) {
        throw new Error(errMsg);
      }
    }

    if ("class" in injectable) {
      if (injectable.isSingleton !== false) {
        const item = this.#singletons.get(injectable.type);
        if (item) return <ReturnValue<A, T>> item;
      }
      const deps: unknown[] = injectable.dependencies?.map((toInject) =>
        this.get(toInject)
      ) ?? [];

      const item = <ReturnValue<A, T>> new injectable.class(...deps);

      if (injectable.isSingleton !== false) {
        this.#singletons.set(injectable.type, item);
      }

      return item;
    }

    if ("function" in injectable) {
      const deps: unknown[] = injectable.dependencies?.map((toInject) => {
        return this.get(toInject);
      }) ?? [];

      return <ReturnValue<A, T>> injectable.function(...deps);
    }

    if ("token" in injectable) {
      return <ReturnValue<A, T>> injectable.value;
    }

    throw new Error(errMsg);
  }

  /**
   * Register an object to be injected by the Factory
   * @method
   * @param {ToInject}
   */
  inject<T>(toInject: ToInject<T>) {
    if ("class" in toInject) {
      this.#registry.push({
        type: toInject.class,
        ...toInject,
      });
      return;
    }
    if ("token" in toInject) {
      this.#registry.push({
        type: toInject.token,
        ...toInject,
      });
      return;
    }
    if ("function" in toInject) {
      this.#registry.push({
        type: toInject.function,
        ...toInject,
      });
      return;
    }
  }
}

const INJECT_METADATA_KEY = "huuma:inject:deps";

/**
 * Decorator to add the dependency metadata to a class. The decorated class can
 * be used directly with the {@link Factory.get} method. Without the need
 * to register the class with {@link Factory.assemble} beforehand.
 */
export function inject<T>(options?: {
  deps?: unknown[];
}): (target: T, context: ClassDecoratorContext) => T {
  return function (target: T, context: ClassDecoratorContext) {
    if (context.kind) {
      context.metadata[INJECT_METADATA_KEY] = [
        ...(options?.deps ? options.deps : []),
      ];
    }
    return target;
  };
}
