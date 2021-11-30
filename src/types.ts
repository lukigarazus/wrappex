export type Wrappex<T> = T & {
  /**
   * Returns a serialized version of the object.
   */
  snapshot: any;
  disposed: boolean;
  /**
   * Makes all fields undefined.
   */
  dispose: () => void;
  /**
   * Does't do anything at the moment.
   */
  updateable: boolean;
  disableUpdates: () => void;
  enableUpdates: () => void;
  /**
   * This is just a utility function, it's not really in line with wrappex philosophy.
   */
  addObservableKey: (key: string, value: any) => void;
  clone: () => Wrappex<T>;
  /**
   * returns modifier context object.
   */
  getCtx: () => { [key: string]: any };
  typename: string;
};

export type WrappexPlugin = readonly ((
  pluginArgs: any,
  args: InitialArguments<Record<string, any>, string[], Record<string, any>> &
    unknown,
  instanceMap: Map<string, any>
) => (
  obj: any
) => {
  objectModification: any;
  reactionCallback: (field: string, value: any) => void;
})[];

// --------------------------------------------------------------------

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type RequiredKeys<T> = Exclude<
  KeysOfType<T, Exclude<T[keyof T], undefined>>,
  undefined
>;

// ---------------------------------------------------------------------

export type KeyToGetter<T> = T extends string ? `get${Capitalize<T>}` : never;

export type KeyFromGetter<T> = T extends `get${infer rest}`
  ? Uncapitalize<rest>
  : never;

export type KeyToSetter<T> = T extends string ? `set${Capitalize<T>}` : never;

export type KeyFromSetter<T> = T extends `set${infer rest}`
  ? Uncapitalize<rest>
  : never;

export type KeyToSetterAndGetter<T> = KeyToGetter<T> | KeyToSetter<T>;

export type KeyFromSetterAndGetter<T> = KeyFromGetter<T> | KeyFromSetter<T>;

export type GettersFromUnion<T> = T extends `get${infer rest}` ? T : never;

export type SettersFromUnion<T> = T extends `set${infer rest}` ? T : never;
// ---------------------------------------------------------------------

export type ObjectFromGetters<T extends { [key: string]: any }> = {
  [key in KeyFromSetterAndGetter<keyof T>]: ReturnType<T[KeyToGetter<key>]>;
};

export type Getter<T, R> = (obj: Wrappex<T>, ctx: any) => R | null;

export type Setter<T, R> = (
  obj: Wrappex<T>,
  value: R | null,
  ctx: any
) => boolean;

export type ObjectToGetters<T, R> = {
  [key in KeyToGetter<keyof T>]: Getter<T, R>;
};

export type ObjectToSetters<T, R> = {
  [key in KeyToSetter<keyof T>]: Setter<T, R>;
};

export type ObjectToGettersAndSetters<T, R = any> = ObjectToGetters<T, R> &
  ObjectToSetters<T, R>;

export type GettersType<T> = T[Extract<keyof T, GettersFromUnion<keyof T>>];

export type SettersType<T> = T[Extract<keyof T, SettersFromUnion<keyof T>>];

// -------------------------------------------------

export interface InitialArguments<Type, Keys, Modifier> {
  fields: Keys;
  init: Type;
  /**
   * Modify all created objects.
   */
  modifier?: Modifier;
  excludeFieldsFromUpdate?: Keys;
  typename: string;
  // checkFields?: Keys;
  // foreignFieldsMapping?: Partial<{ [key in keyof Type]: keyof Type }>;
}

export type UnionToIntersection<T> = (
  T extends any ? (x: T) => any : never
) extends (x: infer R) => any
  ? R
  : never;

export type SafeFirstParameter<
  T extends (...args: any) => any
> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];

export type LeftPrecedenceUnion<L, R> = L & Omit<R, keyof L>;

// ------------------------------------------------------
