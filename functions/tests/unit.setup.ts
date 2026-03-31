//////////////////////////////////// unit.setup.ts ///////////////////////////////////

// ---- Mock Clock ----
export class MockClock {
  private _now: number;
  constructor(now = 0) {
    this._now = now;
  }
  now() {
    return this._now;
  }
  advance(ms: number) {
    this._now += ms;
  }
}

export function mockDoc(data: any = {}) {
  return {
    get: jest
      .fn()
      .mockResolvedValue({
        exists: Object.keys(data).length > 0,
        data: () => data,
      }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

export function mockCollection(doc: any) {
  return {
    doc: jest.fn().mockReturnValue(doc),
    collection: jest
      .fn()
      .mockReturnValue({ doc: jest.fn().mockReturnValue(doc) }),
  };
}

export function mockFirestore(doc: any) {
  return {
    collection: jest
      .fn()
      .mockReturnValue({
        doc: jest
          .fn()
          .mockReturnValue({
            collection: jest
              .fn()
              .mockReturnValue({ doc: jest.fn().mockReturnValue(doc) }),
          }),
      }),
    runTransaction: jest.fn(
      async (cb: any) =>
        await cb({ get: doc.get, set: doc.set, update: doc.update }),
    ),
    recursiveDelete: jest.fn().mockResolvedValue(undefined),
  };
}

export const logEvent = jest.fn();
