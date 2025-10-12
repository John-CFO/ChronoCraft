/////////////////////////////uploadImageToProfile.test.ts//////////////////////

// This file is used to test the uploadImageToProfile function with unit tests

///////////////////////////////////////////////////////////////////////////////

import * as storage from "firebase/storage";

import { uploadImageToProfile } from "../components/utils/storage";

////////////////////////////////////////////////////////////////////////////////

jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

describe("uploadImageToProfile", () => {
  const mockRef = { fullPath: "profilePictures/user123/file.jpg" };

  beforeEach(() => {
    jest.clearAllMocks();
    // mock fetch -> return an object with blob() => { type, size }
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () =>
          Promise.resolve({
            type: "image/jpeg",
            size: 1024,
          }),
      })
    );
    (storage.uploadBytes as jest.Mock).mockResolvedValue({ ref: mockRef });
    (storage.getDownloadURL as jest.Mock).mockResolvedValue(
      "https://cdn.example/img.png"
    );
  });

  it("uploads image and returns URL", async () => {
    const url = await uploadImageToProfile("file://path.jpg", "user123");
    expect(url).toBe("https://cdn.example/img.png");
    expect(global.fetch).toHaveBeenCalledWith("file://path.jpg");
    expect(storage.uploadBytes).toHaveBeenCalled();
    expect(storage.getDownloadURL).toHaveBeenCalled();
  });

  it("rejects non-image blobs", async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve({ type: "text/html", size: 100 }),
      })
    );
    await expect(uploadImageToProfile("file://x", "user123")).rejects.toThrow(
      "File is not an image"
    );
  });

  it("rejects large images", async () => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () =>
          Promise.resolve({ type: "image/png", size: 6 * 1024 * 1024 }),
      })
    );
    await expect(uploadImageToProfile("file://x", "user123")).rejects.toThrow(
      "Image is too large"
    );
  });
});
