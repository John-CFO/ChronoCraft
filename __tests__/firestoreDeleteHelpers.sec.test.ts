///////////////////////firestoreDeleteHelpers.sec.test.ts/////////////////////////////////

// This file tests the AppSec-relevante Logik von firestoreDeleteHelpers

//////////////////////////////////////////////////////////////////////////////////////////

//  NOTE: jest.mock(...) MUST run before importing the helpers so the helpers
//  receive the mocked firestore primitives. Therefore require the helper
//  module after the mock is created.

jest.mock("firebase/firestore", () => {
  // provide runtime-controllable mocks via closures below.
  // the implementations will be defined on these placeholders.
  return {
    collection: (...args: any[]) =>
      (global as any).__mock_collection?.(...args),
    getDocs: (arg: any) => (global as any).__mock_getDocs?.(arg),
    query: (colRef: any, lim: any) =>
      (global as any).__mock_query?.(colRef, lim),
    limit: (n: number) => (global as any).__mock_limit?.(n),
    writeBatch: (db: any) => (global as any).__mock_writeBatch?.(db),
  };
});

//////////////////////////////////////////////////////////////////////////////////////////

import { Firestore } from "firebase/firestore";

///////////////////////////////////////////////////////////////////////////////////////////

// require helpers after the mock is set up
const helpers = require("../components/utils/firestoreDeleteHelpers");

describe("firestoreDeleteHelpers — AppSec validation (mocked firestore)", () => {
  // Provide fresh mock implementations before each test on global placeholders
  beforeEach(() => {
    // reset any previous globals
    (global as any).__mock_collection = undefined;
    (global as any).__mock_getDocs = undefined;
    (global as any).__mock_query = undefined;
    (global as any).__mock_limit = undefined;
    (global as any).__mock_writeBatch = undefined;
    jest.clearAllMocks();
  });

  it("deleteCollectionBatched throws on empty pathSegments", async () => {
    await expect(
      helpers.deleteCollectionBatched({} as Firestore, [])
    ).rejects.toThrow("Empty Firestore path not allowed");
  });

  it("deleteCollectionBatched throws on invalid path segment", async () => {
    await expect(
      helpers.deleteCollectionBatched({} as Firestore, ["Users", "bad/id"])
    ).rejects.toThrow("Invalid path segment");
  });

  it("deleteCollectionBatched batches and commits until empty", async () => {
    // prepare sequence of snapshots: round1 -> 2 docs, round2 -> 1 doc, round3 -> empty
    const docsRound1 = [{ ref: { path: "p/1" } }, { ref: { path: "p/2" } }];
    const docsRound2 = [{ ref: { path: "p/3" } }];
    const docsRound3: any[] = [];

    let call = 0;
    (global as any).__mock_getDocs = async (_arg: any) => {
      call += 1;
      if (call === 1)
        return { empty: false, docs: docsRound1, size: docsRound1.length };
      if (call === 2)
        return { empty: false, docs: docsRound2, size: docsRound2.length };
      return { empty: true, docs: docsRound3, size: 0 };
    };

    (global as any).__mock_collection = (_db: any, ...segments: string[]) => ({
      _path: segments.join("/"),
    });
    (global as any).__mock_query = (colRef: any, _lim: any) => colRef;
    (global as any).__mock_limit = (n: number) => n;

    // writeBatch returns an object with delete (no-op) and commit (spy)
    const commitMock = jest.fn().mockResolvedValue(undefined);
    (global as any).__mock_writeBatch = () => ({
      delete: jest.fn(),
      commit: commitMock,
    });

    const deleted = await helpers.deleteCollectionBatched(
      {} as Firestore,
      ["Users", "uid", "Services", "svc1", "Projects"],
      2
    );

    expect(deleted).toBe(3);
    expect(commitMock).toHaveBeenCalledTimes(2);
    expect((global as any).__mock_collection).toBeDefined();
  });

  it("deleteSubcollections ignores unknown subs and handles Projects->Notes traversal", async () => {
    // In-memory "database" of docs per collection path (collection path = segments.join("/"))
    const docsByPath: Record<string, { id: string; ref: { path: string } }[]> =
      {
        // initial state: two projects under the Projects collection
        "Users/uid/Services/svc1/Projects": [
          {
            id: "projA",
            ref: { path: "Users/uid/Services/svc1/Projects/projA" },
          },
          {
            id: "projB",
            ref: { path: "Users/uid/Services/svc1/Projects/projB" },
          },
        ],
        // notes start empty
        "Users/uid/Services/svc1/Projects/projA/Notes": [],
        "Users/uid/Services/svc1/Projects/projB/Notes": [],
      };

    // collection mock: returns an object with _path so getDocs can branch
    (global as any).__mock_collection = (_db: any, ...segments: string[]) => ({
      _path: segments.join("/"),
    });

    (global as any).__mock_query = (colRef: any, _lim: any) => colRef;
    (global as any).__mock_limit = (n: number) => n;

    // getDocs returns the docs currently in docsByPath for that path
    (global as any).__mock_getDocs = async (arg: any) => {
      const path = arg?._path ?? "";
      const docs = docsByPath[path] ?? [];
      // return a snapshot-like object used by the real function
      return {
        empty: docs.length === 0,
        size: docs.length,
        docs: docs.map((d) => ({ id: d.id, ref: { path: d.ref.path } })),
      };
    };

    // writeBatch returns an object that collects deletes and applies them on commit
    (global as any).__mock_writeBatch = () => {
      const toDelete: { refPath: string }[] = [];
      return {
        delete: (ref: { path: string }) => {
          // record the ref path to be deleted on commit
          toDelete.push({ refPath: ref.path });
        },
        commit: async () => {
          // For each recorded ref, remove the doc from its parent collection
          for (const td of toDelete) {
            const refPath = td.refPath; // e.g. Users/uid/.../Projects/projA
            const parts = refPath.split("/");
            const docId = parts.pop() as string; // projA
            const parentPath = parts.join("/"); // Users/.../Projects

            const col = docsByPath[parentPath];
            if (!col) continue;
            const idx = col.findIndex((x) => x.id === docId);
            if (idx >= 0) col.splice(idx, 1);
          }
          // commit resolves
          return Promise.resolve();
        },
      };
    };

    // Run the real function under test. This will:
    // - delete from Projects collection (using deleteCollectionBatched), which will call writeBatch.commit()
    // - then list Projects via getDocs and for each project call deleteCollectionBatched on Notes,
    //   which here are already empty
    await helpers.deleteSubcollections(
      {} as Firestore,
      ["Users", "uid", "Services", "svc1"],
      ["Foo", "Projects"]
    );

    expect(docsByPath["Users/uid/Services/svc1/Projects"].length).toBe(0);

    expect(
      Array.isArray(docsByPath["Users/uid/Services/svc1/Projects/projA/Notes"])
    ).toBe(true);
    expect(
      Array.isArray(docsByPath["Users/uid/Services/svc1/Projects/projB/Notes"])
    ).toBe(true);
  });

  it("deleteSubcollections throws on invalid parent segment", async () => {
    await expect(
      helpers.deleteSubcollections(
        {} as Firestore,
        ["Users", "bad/id"],
        ["Projects"]
      )
    ).rejects.toThrow("Invalid parent path segment");
  });
});
