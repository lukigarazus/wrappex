import { reaction, makeAutoObservable, ObservableMap } from "mobx";
import { Wrappex, WrappexPlugin } from "./types";
import { WrappexFactory } from "./wrappex";

export interface ICollectionAddedKeys<T> {
  create: (args: T) => Promise<void>;
  add: (model: Wrappex<T>) => void;
  map: (f: (arg: Wrappex<T>) => any) => any[];
  byIndex: (i: number) => Wrappex<T> | void;
}

export type ICollectionModel<T> = ICollectionAddedKeys<T> &
  ObservableMap<number, Wrappex<T>>;

const wrappexCollection = <
  T extends { id?: number },
  M,
  K extends any[],
  P extends WrappexPlugin
>(
  collectionElementModel: WrappexFactory<T, M, K, P>
) => {
  return (): ICollectionModel<T> => {
    let elements: ObservableMap<number, Wrappex<T>> = new ObservableMap();
    const obj: ICollectionAddedKeys<T> = {
      create: async (args: T) => {
        const model = collectionElementModel(args);
        // @ts-ignore
        elements.set(model.id || Math.random(), model);
        // @ts-ignore
        addDisposer(model);
      },
      add: (model: Wrappex<T>) => {
        elements = elements.set(model.id || Math.random(), model);
        addDisposer(model);
      },
      map: (f) => Array.from(elements.values()).map(f),
      byIndex: (i) => Array.from(elements.values())[i],
    };

    const disposers = [];
    const addDisposer = (el: Wrappex<T>) => {
      disposers.push(
        reaction(
          () => {
            return [el.disposed, el.id];
          },
          (_, __, r) => {
            if (el.disposed) {
              const [id] = el.id
                ? [el.id]
                : Array.from(elements.entries()).find(([k, v]) => v === el) || [
                    -1,
                  ];
              if (id) elements.delete(id);
              r.dispose();
            } else if (el.id && !elements.has(el.id)) {
              const [id] = Array.from(elements.entries()).find(
                ([k, v]) => v === el
              ) || [-1];
              elements.delete(id);
              elements.set(el.id, el);
            }
          }
        )
      );
    };

    makeAutoObservable(obj);

    return new Proxy(elements, {
      get(t, p) {
        // @ts-ignore
        if (obj[p]) return obj[p];
        return Reflect.get(t, p);
      },
    }) as ICollectionModel<T> & ObservableMap<number, Wrappex<T>>;
  };
};

export default wrappexCollection;
