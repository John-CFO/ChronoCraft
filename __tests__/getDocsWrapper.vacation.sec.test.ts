///////////////////getDocsWrapper.vacation.sec.test.ts/////////////////////////////

// This file is used to test the getDocsWrapper with a mocked snapshot
// to test the vacation data which comes from firestore inside the VacationList

///////////////////////////////////////////////////////////////////////////////

import { getValidatedDocs } from "../validation/getDocsWrapper.sec";
import { FirestoreVacationSchema } from "../validation/vacationSchemas.sec";

///////////////////////////////////////////////////////////////////////////////

// Mock firebase/firestore BEFORE importing modules that import it
jest.mock("firebase/firestore", () => ({
  getDocs: jest.fn(), // if the wrapper uses getDocs
  collection: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
}));

describe("getValidatedDocs with FirestoreVacationSchema", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    // console.error vor allen Tests mocken
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    // wiederherstellen, damit andere Tests normale Logs sehen
    consoleErrorSpy.mockRestore();
  });

  it("returns only valid vacation docs", async () => {
    // generate a mock snapshot
    const mockSnapshot = {
      docs: [
        {
          id: "abc",
          data: () => ({
            uid: "user1",
            startDate: "2025-09-23",
            markedDates: {
              "2025-09-23": { selected: true },
            },
            createdAt: { toDate: () => new Date("2025-09-23") }, // Firestore Timestamp Mock
            reminderDuration: 10,
          }),
        },
        {
          id: "invalid",
          data: () => ({
            uid: "user2",
            startDate: "23.09.2025", // falsch, wird verworfen
            markedDates: { "23.09.2025": { selected: true } },
          }),
        },
      ],
    };

    // assert a console.error happened for the invalid doc
    const validatedDocs = await getValidatedDocs(
      mockSnapshot,
      FirestoreVacationSchema
    );
    // valid doc kommt zurück
    expect(validatedDocs).toHaveLength(1);
    expect(validatedDocs[0].id).toBe("abc");

    // invalid doc wird verworfen
    expect(validatedDocs.find((d) => d.id === "invalid")).toBeUndefined();
  });
});
