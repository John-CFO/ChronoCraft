//////////////////////////// reviewerWhitelist.test.ts //////////////////////////

// Unit tests for reviewer whitelist validation

///////////////////////////////////////////////////////////////////////////////

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
}));

///////////////////////////////////////////////////////////////////////////////

import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

import { mockDoc, mockFirestore } from "../../unit.setup";
import { validateReviewerEmail } from "../../../src/functions/beforeUserCreated";

///////////////////////////////////////////////////////////////////////////////

describe("validateReviewerEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject inactive reviewer", async () => {
    const doc = mockDoc({ active: false });

    (getFirestore as jest.Mock).mockReturnValue(mockFirestore(doc));

    await expect(
      validateReviewerEmail("reviewer@example.com"),
    ).rejects.toBeInstanceOf(HttpsError);
  });

  it("should reject unknown email", async () => {
    const doc = mockDoc();

    (getFirestore as jest.Mock).mockReturnValue(mockFirestore(doc));

    await expect(
      validateReviewerEmail("reviewer@example.com"),
    ).rejects.toBeInstanceOf(HttpsError);
  });

  it("should normalize uppercase email", async () => {
    const doc = mockDoc({ active: true });

    const firestore = mockFirestore(doc);

    (getFirestore as jest.Mock).mockReturnValue(firestore);

    await expect(
      validateReviewerEmail("REVIEWER@EXAMPLE.COM"),
    ).resolves.toBeUndefined();

    expect(firestore.collection().doc().collection().doc).toHaveBeenCalledWith(
      "reviewer@example.com",
    );
  });

  it("should trim whitespace from email", async () => {
    const doc = mockDoc({ active: true });

    const firestore = mockFirestore(doc);

    (getFirestore as jest.Mock).mockReturnValue(firestore);

    await expect(
      validateReviewerEmail("  reviewer@example.com  "),
    ).resolves.toBeUndefined();

    expect(firestore.collection().doc().collection().doc).toHaveBeenCalledWith(
      "reviewer@example.com",
    );
  });
});
