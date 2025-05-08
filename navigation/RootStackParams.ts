///////////RootStackParamList Typedefinition/////////////////

// type for RootStackParamList for HomeScreen and DetailsScreen

////////////////////////////////////////////////////////////

export type RootStackParamList = {
  Home: { fromRegister?: boolean };
  Details: { projectId: string; projectName: string };
};
