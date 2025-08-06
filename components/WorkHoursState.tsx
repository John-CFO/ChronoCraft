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
  docExists: boolean;
  startWorkTime: Date | null;
  isWorking: boolean;
  elapsedTime: number;
  currentDocId: string | null;
  workHours: any[];
  data: any[];
  selectedBar: any[];

  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
  setDocExists: (value: boolean) => void;
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

////////////////////////////////////////////////////////////////////////////

const WorkHoursState = create<WorkHoursStateProps>((set, get) => ({
  // statevariables
  useTimeZone: "",
  workData: [],
  expectedHours: "",
  docExists: false,
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
      const today = new Date().toISOString().split("T")[0];
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        "AczkjyWoOxdPAIRVxjy3",
        "WorkHours",
        today
      );

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const state = docSnap.data();
        const savedDate = state.lastUpdatedDate || "";

        // set the state if the saved date is today
        if (savedDate === today) {
          set({
            currentDocId: today,
            lastUpdatedDate: today,
          });
        }
      }
    } catch (error) {
      console.error("Error loading state:", error);
    }
  },

  // save state to firestore
  saveState: async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    const state = get();
    const stateToSave = {
      elapsedTime: state.elapsedTime,
      isWorking: state.isWorking,
      startWorkTime: state.startWorkTime,
      currentDocId: state.currentDocId,
    };

    const docRef = doc(
      FIREBASE_FIRESTORE,
      "Users",
      user.uid,
      "Services",
      "AczkjyWoOxdPAIRVxjy3",
      "WorkHours",
      state.currentDocId || "defaultDocId"
    );

    await setDoc(docRef, stateToSave);
  },

  // actions to update the workhoursstate
  setUserTimeZone: (timeZone) => set({ useTimeZone: timeZone }),
  setWorkData: (data) => set({ workData: data }),
  setExpectedHours: (hours) => set({ expectedHours: hours }),
  setDocExists: (value) => set({ docExists: value }),
  setStartWorkTime: (time) => set({ startWorkTime: time }),
  setIsWorking: (working) => set({ isWorking: working }),
  setElapsedTime: (time) => set({ elapsedTime: time }),
  setCurrentDocId: (docId) => set({ currentDocId: docId }),
  setWorkHours: (hours) => set({ workHours: hours }),
  setData: (data) => set({ data: data }),
  setSelectedBar: (bar) => set({ selectedBar: bar }),
}));

export default WorkHoursState;
