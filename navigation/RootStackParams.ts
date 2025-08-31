///////////RootStackParamList Typedefinition/////////////////

// type for RootStackParamList for HomeScreen and DetailsScreen

////////////////////////////////////////////////////////////

import { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Login: undefined;
  Inside: NavigatorScreenParams<DrawerParamList>;
  Details: { projectId: string; projectName: string };
};

export type DrawerParamList = {
  Home: { fromRegister?: boolean };
  WorkHours: undefined;
  Vacation: undefined;
};
