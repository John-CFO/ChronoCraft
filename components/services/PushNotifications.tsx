///////////////////////////////////PushNotifications Component////////////////////////////

// NOTE: Ensure that the NotificationManager is initialized in App.tsx before using this component

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { FIREBASE_FIRESTORE } from "../../firebaseConfig";

//////////////////////////////////////////////////////////////////////////////////////////

export class NotificationManager {
  private static isConfigured = false; // prevents double configuration

  // configuation for push notifications
  static configureNotificationHandler() {
    if (this.isConfigured) return; // jump out if already configured

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    this.isConfigured = true; // mark as configured
  }

  // register the device for push notifications, get the token and get the permission
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      const { status } = await Notifications.getPermissionsAsync(); // prove current permission
      if (status !== "granted") {
        const { status: newStatus } =
          await Notifications.requestPermissionsAsync(); // request permission
        if (newStatus !== "granted") {
          console.log("Push-Notification permission not granted.");
          return null; // if permission is not granted return null
        }
      }
      // generate the Expo pushtoken
      const token = (await Notifications.getExpoPushTokenAsync()).data;

      if (Platform.OS === "android") {
        // config the notification channel for android devices
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX, // max importance because we want to be notified
          sound: "default", // standard sound for android devices is default
          vibrationPattern: [0, 250, 250, 250], // default vibration pattern
        });
      }

      return token; // return generated token
    } catch (error) {
      console.error("Error while registering for push notifications:", error);
      return null; // returns null if there is an error
    }
  }

  // save the push token to the firestore and also merge the push token with the user-ID
  static async savePushTokenToDatabase(userId: string, pushToken: string) {
    try {
      const userRef = doc(FIREBASE_FIRESTORE, "Users", userId); // ref for the user document
      await setDoc(userRef, { pushToken }, { merge: true }); // save the push token (merge:true prevents overwriting)
      console.log("Push token successfully saved.");
    } catch (error) {
      console.error("Error saving push token:", error);
    }
  }

  // plane a notification
  static async scheduleNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput
  ) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger, // trigger for the notification when it should be sent
      });
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  }

  // send a welcome notification after registration
  static async sendWelcomeNotification(token: string) {
    const trigger: Notifications.NotificationTriggerInput = {
      seconds: 1, // send notification immediately
    };

    await this.scheduleNotification(
      "Welcome to ChronoCraft! ⏱️",
      "We're glad you’ve joined. Let’s track time like a pro.",
      trigger
    );
  }

  // plan a notification for a vacation
  static async scheduleVacationReminder(
    title: string,
    body: string,
    vacationDate: Date,
    token: string
  ) {
    const trigger: Notifications.NotificationTriggerInput = {
      date: vacationDate, // send notification on the vacation date (1 day, 3 days or 7 days before)
    };

    await this.scheduleNotification(title, body, trigger);
  }
}
