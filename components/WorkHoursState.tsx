///////////////////////WorkHoursState Component////////////////////////////

// this component uses the zustand state management library
// to manage the state of the workhours component

///////////////////////////////////////////////////////////////////////////

import { create } from "zustand";
import { getAuth } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { FIREBASE_FIRESTORE } from "../firebaseConfig";

////////////////////////////////////////////////////////////////////////////

// type for the workhoursstate
interface WorkHoursStateProps {
  [key: string]: any;
  useTimeZone: string;
  workData: any[];
  expectedHours: string;
  startWorkTime: Date | null;
  isWorking: boolean;
  elapsedTime: number;
  currentDocId: string | null;
  workHours: any[];
  data: any[];
  selectedBar: any[];

  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
  setUserTimeZone: (timeZone: string) => void;
  setWorkData: (data: any[]) => void;
  setExpectedHours: (hours: string) => void;
  setStartWorkTime: (time: Date | null) => void;
  setIsWorking: (working: boolean) => void;
  setElapsedTime: (time: number) => void;
  setCurrentDocId: (docId: string | null) => void;
  setWorkHours: (hours: any[]) => void;
  setData: (data: any[]) => void;
  setSelectedBar: (bar: any) => void;
}

// declare firebase auth
const auth = getAuth();

const WorkHoursState = create<WorkHoursStateProps>((set, get) => ({
  // statevariables
  useTimeZone: "",
  workData: [],
  expectedHours: "",
  startWorkTime: null,
  isWorking: false,
  elapsedTime: 0,
  currentDocId: null,
  workHours: [],
  data: [],
  selectedBar: [],

  //  load state from firestore
  loadState: async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    try {
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "WorkHours",
        get().currentDocId || "defaultDocId"
      );
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const state = docSnap.data();
        set(state);
      }
    } catch (error) {
      console.log("Error loading state from Firestore:", error);
    }
  },

  saveState: async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    const state = get();
    const stateToSave = { ...state }; // kopie the state

    // delete all states from the function
    Object.keys(stateToSave).forEach((key) => {
      if (typeof stateToSave[key] === "function") {
        delete stateToSave[key];
      }
    });

    const docRef = doc(
      FIREBASE_FIRESTORE,
      "Users",
      user.uid,
      "Services",
      "AczkjyWoOxdPAIRVxjy3",
      "WorkHours",
      state.currentDocId || "defaultDocId"
    );
    await setDoc(docRef, stateToSave); // save only state nessesary data
  },

  // actions to update the workhoursstate
  setUserTimeZone: (timeZone) => set({ useTimeZone: timeZone }),
  setWorkData: (data) => set({ workData: data }),
  setExpectedHours: (hours) => set({ expectedHours: hours }),
  setStartWorkTime: (time) => set({ startWorkTime: time }),
  setIsWorking: (working) => set({ isWorking: working }),
  setElapsedTime: (time) => set({ elapsedTime: time }),
  setCurrentDocId: (docId) => set({ currentDocId: docId }),
  setWorkHours: (hours) => set({ workHours: hours }),
  setData: (data) => set({ data: data }),
  setSelectedBar: (bar) => set({ selectedBar: bar }),
}));

export default WorkHoursState;
