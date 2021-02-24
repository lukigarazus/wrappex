import pluggableReactor from "../index";
import { autorun, runInAction } from "mobx";
import "jest";

type TestType = {
  id: number;
  a: number;
  b: string;
};

describe("basic reactor", () => {
  const basicReactor = pluggableReactor([]);

  const testTypeFactory = basicReactor({
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
      obj.enableUpdates();
      expect(obj.updateable).toBe(true);
    });
    it("Snapshot and clone work", () => {
      const obj = testTypeFactory({ a: 1 });
      expect(obj.snapshot()).toEqual({ a: 1 });
      expect(obj.clone().snapshot()).toEqual(obj.snapshot());
    });
    it("Dispose works", () => {
      const obj = testTypeFactory({});
      expect(obj.disposed).toBe(false);
      expect(obj.dispose());
      expect(obj.disposed).toBe(true);
      expect(obj.updateable).toBe(false);
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
      // @ts-ignore
      obj.test = 3;
      expect(f).toHaveBeenCalled();
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
    runInAction(() => {
      obj.a = 5;
    });
    expect(f).toHaveBeenCalled();
  });
  it("reusing instances works", () => {
    const obj1 = testTypeFactory({ id: 1 });
    const obj2 = testTypeFactory({ id: 1 });
    expect(obj1 === obj2).toBe(true);
  });
});

describe("modified reactor", () => {
  const basicReactor = pluggableReactor([]);

  const testTypeFactoryModified = basicReactor({
    typename: "TestType",
    init: {} as TestType,
    fields: ["a", "b"],
    modifier: {
      getA: (obj: any, ctx: any) => {
        return ctx.value || "default string";
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
});
