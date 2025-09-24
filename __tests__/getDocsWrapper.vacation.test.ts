///////////////////getDocsWrapper.vacation.test.ts/////////////////////////////

// This file is used to test the getDocsWrapper with a mocked snapshot
// to test the vacation data which comes from firestore inside the VacationList

///////////////////////////////////////////////////////////////////////////////

import { getValidatedDocs } from "../validation/getDocsWrapper";
import { FirestoreVacationSchema } from "../validation/vacationSchemas";

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
  it("returns only valid vacation docs", async () => {
    // spy console.error
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    // generate a mock snapshot
    const mockSnapshot = {
      docs: [
        {
          id: "abc",
          data: () => ({
            uid: "user1",
            startDate: "2025-09-23",
            markedDates: { "2025-09-23": { selected: true } },
            createdAt: new Date("2025-09-23"),
            reminderDuration: 10,
          }),
        },
        {
          id: "invalid",
          data: () => ({
            uid: "user2",
            startDate: "23.09.2025", // wrong date format -> invalid
            markedDates: {},
          }),
        },
      ],
    };

    // Call: The wrapper function can either expect a CollectionRef or a Snapshot.
    const result = await getValidatedDocs(
      mockSnapshot as any,
      FirestoreVacationSchema as any
    );
    // assert a console.error happened for the invalid doc
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy.mock.calls[0][0]).toEqual(
      expect.stringContaining("Invalid Firestore document")
    );
    // restore
    consoleErrorSpy.mockRestore();
  });
});
