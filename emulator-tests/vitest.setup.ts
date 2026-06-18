import { afterEach } from "vitest";
import { auth } from "./setup.js";

afterEach(async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await user.delete();
  } catch {
    // ignore
  }
});
