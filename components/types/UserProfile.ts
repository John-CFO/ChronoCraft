//////////////////// UserProfile.ts ////////////////////

// Defines the UserProfile type used across the app.
// This type represents additional Firestore-based user fields
// and is used in combination with Firebase Auth's User object.
//
// Example usage:
// - In CustomDrawer → to validate and store user profile data
// - In Firestore validation → combined with FirestoreUserSchema
//
// Purpose:
// Keeps Firestore user data strictly typed and separate from
// the built-in Firebase Auth User type.

/////////////////////////////////////////////////////////

export interface UserProfile {
  uid?: string; // brauchst du sowieso überall
  personalID?: string | null;
  email?: string | null;
  firstLogin?: boolean;
  totpEnabled?: boolean;
  totpSecret?: string | null;
  hasSeenHomeTour?: boolean;
  hasSeenVacationTour?: boolean;
  hasSeenWorkHoursTour?: boolean;
  hasSeenDetailsTour?: boolean;
  createdAt?: Date;

  photoURL?: string | null;
}
