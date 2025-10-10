//////////////////////////////////handleSaveProfile.test.tsx////////////////////

// This file is used to test the handleSaveProfile function with unit tests

///////////////////////////////////////////////////////////////////////////////

import { handleSaveProfile } from "../components/utils/handleSaveProfile";

///////////////////////////////////////////////////////////////////////////////

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock("../components/utils/storage", () => ({
  uploadImageToProfile: jest.fn(),
}));

describe("handleSaveProfile - validation", () => {
  let updateDocMock: jest.Mock;
  let uploadImageToProfileMock: jest.Mock;

  beforeAll(() => {
    const firestore = require("firebase/firestore");
    updateDocMock = firestore.updateDoc as jest.Mock;

    const storage = require("../components/utils/storage");
    uploadImageToProfileMock = storage.uploadImageToProfile as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show alert if name and personalID are empty", async () => {
    const showAlert = jest.fn();
    const onClose = jest.fn();
    const setSaving = jest.fn();

    await handleSaveProfile({
      userId: "uid123",
      newName: "", // empty -> invalid
      newPersonalID: "", // empty -> invalid
      imageUri: null, // no Picture
      showAlert,
      onClose,
      setSaving,
    });

    expect(showAlert).toHaveBeenCalledTimes(1);
    expect(String(showAlert.mock.calls[0][0]).toLowerCase()).toContain(
      "invalid"
    );
  });
  it("updates profile if valid data", async () => {
    const showAlert = jest.fn();
    const onClose = jest.fn();
    const setSaving = jest.fn();

    uploadImageToProfileMock.mockResolvedValue("https://img.url");
    updateDocMock.mockResolvedValue(undefined);

    await handleSaveProfile({
      userId: "uid123",
      newName: "John",
      newPersonalID: "ABC123",
      imageUri: "file://test.jpg",
      showAlert,
      onClose,
      setSaving,
    });

    expect(uploadImageToProfileMock).toHaveBeenCalledWith(
      "file://test.jpg",
      "uid123"
    );
    expect(updateDocMock).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
