import {
  makeAutoObservable,
  makeObservable,
  reaction,
  IReactionDisposer,
  observable,
} from "mobx";

import * as Types from "./types";
import { capitalize } from "./utils";

const instanceMap = new Map();

export type WrappexFactory<
  Type,
  Modifier,
  Keys extends any[],
  Plugins extends Types.WrappexPlugin
> = (init: Partial<Type>) => Types.Wrappex<
  Omit<
    {
      [key in Extract<keyof Type, Keys[number]>]: Type[key];
    },
    Types.KeyFromSetterAndGetter<Types.RequiredKeys<Modifier>>
  > &
    Types.ObjectFromGetters<Modifier> & { id: number }
> &
  Types.UnionToIntersection<
    ReturnType<ReturnType<Plugins[number]>>["objectModification"]
  >;

const pluggableWrapex = <Plugins extends Types.WrappexPlugin>(
  plugins: Plugins
) =>
  function wrapex<
    Type extends { id?: number },
    Keys extends (keyof Type)[],
    Modifier extends Partial<Types.ObjectToGettersAndSetters<Type>> & {
      [key: string]: unknown;
    } = {}
  >(
    args: Types.LeftPrecedenceUnion<
      Types.InitialArguments<Type, Keys, Modifier>,
      Types.UnionToIntersection<Types.SafeFirstParameter<Plugins[number]>>
    >
  ): WrappexFactory<Type, Modifier, Keys, Plugins> {
    let {
      typename,
      fields,
      excludeFieldsFromUpdate,
      // checkFields,
      modifier,
    } = args;

    if (!fields.includes("id")) fields.push("id");
    if (!instanceMap.has(typename)) {
      instanceMap.set(typename, new Map());
    }

    const seededPlugins = plugins.map((p) => p(args, args as any, instanceMap));

    const curried = (init: Partial<Type>) => {
      // @ts-ignore
      const instance = instanceMap.get(typename)?.get(init.id);
      if (instance) {
        return instance;
      }

      // ensure id is set
      if (!("id" in init)) init.id = Math.random();

      let updateable = true;
      let disposed = observable.box(false);
      const ctx = {};

      // @ts-ignore
      let obj: ReturnTypo<Type> = {
        snapshot: () => {
          return fields.reduce((acc, field) => {
            const value = obj[field];
            if (value !== null)
              // @ts-ignore
              acc[field] = value;
            return acc;
          }, {});
        },

        getCtx: () => ctx,

        addObservableKey: (key: string, value: any) => {
          obj[key] = value;
          // fields.push(key as any);
          makeObservable(obj, { [key]: observable });
        },

        dispose: () => {
          instanceMap.get(typename)?.delete(obj.id);
          disposed.set(true);
          disposers.forEach((d) => d());
          fields.forEach((f) => {
            delete obj[f];
          });
          updateable = false;
        },

        get updateable() {
          return updateable;
        },

        get disposed() {
          return disposed.get();
        },

        enableUpdates: () => {
          updateable = true;
        },

        disableUpdates: () => {
          updateable = false;
        },

        clone: () => {
          const snap = obj.snapshot();
          if (obj.id) delete snap.id;
          return curried(snap);
        },

        typename,
      };

      const reactionCallbacks = seededPlugins.map((p) => {
        const plugin = p(obj);
        Object.entries(plugin.objectModification).forEach(([k, v]) => {
          obj[k] = v;
        });
        return plugin.reactionCallback;
      });

      // define all fields up front
      fields.forEach((field) => {
        // @ts-ignore
        obj[field] = init[field];
      });

      // exclude fields from updates
      const fieldz = fields.filter(
        (el) => !(excludeFieldsFromUpdate || ([] as any)).includes(el)
      );

      // @ts-ignore
      modifier = { ...(modifier || {}) };

      // Object.keys(modifier || {}).forEach((key) => {
      //   obj[key] = undefined;
      // });

      makeAutoObservable(obj);
      const disposers: IReactionDisposer[] = [];
      fieldz.forEach((field) => {
        if (typeof field === "string")
          disposers.push(
            reaction(
              () => obj[field],
              (v: any) => {
                reactionCallbacks.forEach((c) => c(field, v));
              }
            )
          );
      });

      if (Object.keys(modifier || {}).length) {
        const proxy = new Proxy(obj, {
          get(t, p: string, ...args) {
            if (obj.disposed && fields.includes(p as any)) return undefined;

            if (modifier) {
              const key = `get${capitalize(
                p
              )}` as keyof Types.ObjectToGettersAndSetters<Type>;
              if (modifier[key]) {
                // @ts-ignore
                return modifier[key](obj, ctx);
              }
            }
            return Reflect.get(t, p, ...args);
          },
          set(t, p: string, v: any, ...args) {
            if (modifier) {
              const key = `set${capitalize(
                p
              )}` as keyof Types.ObjectToGettersAndSetters<Type>;
              if (modifier[key]) {
                // @ts-ignore
                return modifier[key](obj, v, ctx);
              }
            }
            return Reflect.set(t, p, v, ...args);
          },
        });
        if (obj.id) {
          instanceMap.get(typename)?.set(obj.id, proxy);
        }
        return proxy;
      }
      if (obj.id) {
        instanceMap.get(typename)?.set(obj.id, obj);
      }
      return obj;
    };
    return curried;
  };

export default pluggableWrapex;
