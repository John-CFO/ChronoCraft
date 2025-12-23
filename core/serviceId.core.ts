import * as SecureStore from "expo-secure-store";
import { nanoid } from "nanoid/non-secure";

export async function loadOrCreateServiceId(): Promise<string> {
  let serviceId = await SecureStore.getItemAsync("serviceId");

  if (!serviceId) {
    serviceId = nanoid();
    await SecureStore.setItemAsync("serviceId", serviceId);
  }

  return serviceId;
}
