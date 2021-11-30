import pluggableWrapex from "../wrappex";
import { autorun } from "mobx";
import "jest";

type TestType = {
  id: number;
  a: number;
  b: string;
};

describe("basic wrappex", () => {
  const basicWrappex = pluggableWrapex([]);

  const testTypeFactory = basicWrappex({
    typename: "TestType",
    init: {} as TestType,
    fields: ["a", "b"],
  });
  it("fields are undefined by default", () => {
    const obj = testTypeFactory({});
    expect(obj.a).toBe(undefined);
    expect(obj.b).toBe(undefined);
  });
  describe("built in fields work", () => {
    it("Updateable works", () => {
      const obj = testTypeFactory({});
      expect(obj.updateable).toBe(true);
      obj.disableUpdates();
      expect(obj.updateable).toBe(false);
      // this should work
      // obj.a = 1;
      // expect(obj.a).toBe(undefined);
      obj.enableUpdates();
      expect(obj.updateable).toBe(true);
    });
    it("Snapshot and clone work", () => {
      const obj = testTypeFactory({ a: 1 });
      expect(obj.snapshot().a).toEqual(1);
      expect(obj.clone().snapshot().a).toEqual(obj.snapshot().a);
    });
    it("Dispose works", () => {
      const f = jest.fn();
      const obj = testTypeFactory({ id: 1 });
      autorun(() => {
        obj.disposed;
        f();
      });
      expect(f).toHaveBeenCalledTimes(1);
      expect(obj.disposed).toBe(false);
      expect(testTypeFactory({ id: 1 })).toBe(obj);
      expect(obj.dispose());
      expect(obj.disposed).toBe(true);
      expect(obj.updateable).toBe(false);
      expect(f).toHaveBeenCalledTimes(2);
      expect(obj.a).toBe(undefined);
      expect(testTypeFactory({ id: 1 })).not.toBe(obj);
    });
    it("Add observable key works", () => {
      const obj = testTypeFactory({});
      obj.addObservableKey("test", 2);
      const f = jest.fn();
      autorun(() => {
        // @ts-ignore
        if (obj.test) {
          f();
        }
      });
      expect(f).toHaveBeenCalledTimes(1);
      // @ts-ignore
      obj.test = 3;
      expect(f).toHaveBeenCalledTimes(2);
    });
    it("Context works", () => {
      const obj = testTypeFactory({});
      expect(obj.getCtx()).toEqual({});
    });
  });
  it("reactions work", () => {
    const obj = testTypeFactory({});
    const f = jest.fn();
    autorun(() => {
      if (obj.a) f();
    });
    obj.a = 5;
    // only once because a is undefined at the beginning
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("reusing instances works", () => {
    const obj1 = testTypeFactory({ id: 1 });
    const obj2 = testTypeFactory({ id: 1 });
    expect(obj1 === obj2).toBe(true);
  });
});

describe("modified wrappex", () => {
  const basicWrappex = pluggableWrapex([]);

  const testTypeFactoryModified = basicWrappex({
    typename: "TestType",
    init: {} as TestType,
    fields: ["a", "b"],
    modifier: {
      getA: (obj: any, ctx: any) => {
        console.log(obj.a);

        return obj.a || ctx.value || "default string";
      },
      setA: (obj: any, v: string, ctx: any) => {
        ctx.value = v;
        return true;
      },
    },
  });
  it("modified fields work", () => {
    const obj = testTypeFactoryModified({});
    expect(obj.a).toBe("default string");
    obj.a = "new string";
    expect(obj.a).toBe("new string");
    expect(obj.b).toEqual(undefined);
    obj.b = "test";
    expect(obj.b).toEqual("test");
  });
  it("reusing instances works with proxy", () => {
    const obj1 = testTypeFactoryModified({ id: 1 });
    const obj2 = testTypeFactoryModified({ id: 1 });
    expect(obj1 === obj2).toBe(true);
  });
  it("snapshot works with proxy", () => {
    const obj = testTypeFactoryModified({ id: 2 });
    expect(obj.snapshot()).toEqual({ id: 2 });
  });
  it("clone works with proxy", () => {
    const obj = testTypeFactoryModified({ id: 3 });
    expect(obj.clone().a).toEqual("default string");
  });
  it("additional modifier works with proxy", () => {
    const obj = testTypeFactoryModified({ id: 4 });
    expect(obj.clone().a).toEqual("default string");
  });
  it("dispose works with proxy", () => {
    const obj = testTypeFactoryModified({ id: 5, a: 2 });
    expect(obj.a).toBe(2);
    expect(obj.disposed).toBe(false);
    obj.dispose();
    expect(obj.disposed).toBe(true);
    expect(obj.a).toBe(undefined);
  });
});

describe("plugged wrappex", () => {
  const basicWrappex = pluggableWrapex([
    (pArgs: { testPluginArg: number }) => (obj: any) => {
      return {
        objectModification: {
          create: () => {
            obj.id = ++pArgs.testPluginArg;
          },
        },
        reactionCallback: (field, v) => {
          if (field !== "id") obj.id = `${field}-${v}`;
        },
      };
    },
  ]);

  const testTypeFactoryModified = basicWrappex({
    typename: "TestType",
    init: {} as TestType,
    fields: ["a", "b"],
    testPluginArg: 1,
  });
  it("fields from plugins work", () => {
    const obj = testTypeFactoryModified({});
    expect(obj.create).toBeDefined();
    expect(obj.id).toBeDefined();
    obj.create();
    expect(obj.id).toEqual(2);
    obj.b = "23";
    expect(obj.id).toEqual("b-23");
  });
});
