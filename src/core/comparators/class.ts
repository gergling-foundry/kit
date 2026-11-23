import { Comparator } from "./types";
import { compareAlphabeticalAsc } from "./utilities";

export class ComparatorFactory<T> {
  constructor(private comparator: Comparator<T>) { }

  sort(values: T[]) { return [...values].sort((a, b) => this.comparator(a, b)); }
  run = ((a: T, b: T) => this.comparator(a, b)).bind(this);

  flip = () => new ComparatorFactory<T>((
    a, b
  ) => this.comparator(b, a));

  static rank = <T>(ranking: T[]) => new ComparatorFactory<T>((
    a, b
  ) => ranking.indexOf(a) - ranking.indexOf(b));

  from = <From>(
    mapper: (params: From) => T
  ) => new ComparatorFactory<From>(
    (a, b) => this.comparator(mapper(a), mapper(b))
  );

  static stack = <T>(
    instances: ComparatorFactory<T>[]
  ): ComparatorFactory<T> => {
    return new ComparatorFactory((a, b) => {
      for (const instance of instances) {
        const result = instance.run(a, b);
        if (result !== 0) return result;
      }
      return 0;
    });
  }

  static instantiate(params?: 'number'): ComparatorFactory<number>;
  static instantiate(params: 'string'): ComparatorFactory<string>;
  static instantiate<T>(
    params:
      | Comparator<T>
      | ComparatorFactory<T>
      | (Comparator<T> | ComparatorFactory<T>)[]
  ): ComparatorFactory<T>;
  static instantiate<T>(
    params?:
      | Comparator<T>
      | ComparatorFactory<T>
      | (Comparator<T> | ComparatorFactory<T>)[]
      | 'string' | 'number'
  ) {
    if (Array.isArray(params)) return ComparatorFactory.stack(params.map(
      (param) => ComparatorFactory.instantiate(param)
    ));
    if (params instanceof ComparatorFactory) return params;
    if (typeof params === 'function') {
      return new ComparatorFactory(params)
    };
    if (params === 'string') return new ComparatorFactory(compareAlphabeticalAsc);
    return new ComparatorFactory((a: number, b: number) => a - b);
  }

  static maps<T>(mappers: ((params: T) => number)[]) {
    return mappers.map(
      ComparatorFactory.instantiate().from<T>
    );
  }
}
