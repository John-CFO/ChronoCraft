////////////CustomUser type definition import to handle conflict with FirebaseUser//////////

// this component handled the conflict with FirebaseUser (User) as CustomUser and makes it possible to show the profile picture in the CustomDrawer

///////////////////////////////////////////////////////////////////////////////////////////

import { User as FirebaseUser } from "firebase/auth";

import { UserProfile } from "./UserProfile";

///////////////////////////////////////////////////////////////////////////////////////////
export interface CustomUser extends FirebaseUser {
  personalID?: string;
  totpEnabled?: boolean;
  firstLogin?: boolean;
  hasSeenHomeTour?: boolean;
  hasSeenVacationTour?: boolean;
  hasSeenWorkHoursTour?: boolean;
  hasSeenDetailsTour?: boolean;
}

// use MergedUser to combine FirebaseUser and UserProfile
// to use it in the CustomDrawer (fetchUserProfile)
export type MergedUser = FirebaseUser & UserProfile;
