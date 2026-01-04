//////////////////////// profileService.test.ts ///////////////////////////////

// This file contains the unit tests for the ProfileService class.
// It is used to update a user's profile.

///////////////////////////////////////////////////////////////////////////////

// mock dependencies first to avoid errors
jest.mock("../../../src/repos/userRepo");
jest.mock("../../../src/utils/logger");

import { ProfileService } from "../../../src/services/profileService";
import { UserRepo } from "../../../src/repos/userRepo";
import { logEvent } from "../../../src/utils/logger";

///////////////////////////////////////////////////////////////////////////////

describe("ProfileService Unit Tests", () => {
  let profileService: ProfileService;
  let mockUserRepo: jest.Mocked<UserRepo>;
  let mockLogEvent: jest.MockedFunction<typeof logEvent>;

  beforeEach(() => {
    mockUserRepo = new UserRepo() as jest.Mocked<UserRepo>;
    mockLogEvent = logEvent as jest.MockedFunction<typeof logEvent>;

    profileService = new ProfileService();
    // @ts-ignore - access private property for testing
    profileService.userRepo = mockUserRepo;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("updateProfile", () => {
    it("should update displayName and personalNumber successfully", async () => {
      const uid = "user123";
      const updateData = {
        displayName: "New Name",
        personalNumber: "PN-00123",
      };

      mockUserRepo.updateUser.mockResolvedValue(undefined);

      const result = await profileService.updateProfile(uid, updateData);

      expect(mockUserRepo.updateUser).toHaveBeenCalledWith(uid, updateData);
      expect(mockLogEvent).toHaveBeenCalledWith("profile updated", "info", {
        uid,
        updatedFields: ["displayName", "personalNumber"],
      });
      expect(result).toEqual({ success: true });
    });

    it("should handle empty update data", async () => {
      const uid = "user123";
      const updateData = {};

      mockUserRepo.updateUser.mockResolvedValue(undefined);

      const result = await profileService.updateProfile(uid, updateData);

      expect(mockUserRepo.updateUser).toHaveBeenCalledWith(uid, updateData);
      expect(mockLogEvent).toHaveBeenCalledWith("profile updated", "info", {
        uid,
        updatedFields: [],
      });
      expect(result).toEqual({ success: true });
    });

    it("should throw when update fails", async () => {
      const uid = "user123";
      const updateData = { displayName: "New Name" };

      mockUserRepo.updateUser.mockRejectedValue(new Error("Database error"));

      await expect(
        profileService.updateProfile(uid, updateData)
      ).rejects.toThrow("Database error");
    });

    it("should sanitize displayName and personalNumber", async () => {
      const uid = "user123";
      const updateData = {
        displayName: '<script>alert("xss")</script>New Name',
        personalNumber: "PN-<b>00123</b>",
      };

      const sanitize = (input: string) =>
        input
          .replace(/<[^>]*>/g, "")
          .replace(/alert\([^)]*\)/g, "")
          .trim();

      const sanitizedDisplayName = sanitize(updateData.displayName);
      const sanitizedPersonalNumber = sanitize(updateData.personalNumber);

      expect(sanitizedDisplayName).toBe("New Name");
      expect(sanitizedPersonalNumber).toBe("PN-00123");
    });

    describe("uid handling", () => {
      it("should throw if uid is undefined", async () => {
        const updateData = { displayName: "New Name" };
        // @ts-ignore
        await expect(
          profileService.updateProfile(undefined as any, updateData)
        ).rejects.toThrow();
      });

      it("should throw if uid is null", async () => {
        const updateData = { displayName: "New Name" };
        // @ts-ignore
        await expect(
          profileService.updateProfile(null as any, updateData)
        ).rejects.toThrow();
      });

      it("should throw if uid is empty string", async () => {
        const updateData = { displayName: "New Name" };
        await expect(
          profileService.updateProfile("", updateData)
        ).rejects.toThrow();
      });

      it("should throw if uid contains invalid characters", async () => {
        const updateData = { displayName: "New Name" };
        const invalidUid = "user!@#";
        await expect(
          profileService.updateProfile(invalidUid, updateData)
        ).rejects.toThrow();
      });
    });
  });
});
