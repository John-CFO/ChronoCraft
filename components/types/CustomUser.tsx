////////////CustomUser type definition import to handle conflict with FirebaseUser//////////

// this component handled the conflict with FirebaseUser (User) as CustomUser and makes it possible to show the profile picture in the CustomDrawer

import { User as FirebaseUser } from "firebase/auth";

//////////////////////////////////////////////////////////////7
export interface CustomUser extends FirebaseUser {
  personalID?: string;
}
