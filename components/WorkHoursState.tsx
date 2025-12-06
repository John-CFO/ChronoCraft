///////////////////////WorkHoursState Component////////////////////////////

// this component uses the zustand state management library
// to manage the state of the workhours component

///////////////////////////////////////////////////////////////////////////

import { create } from "zustand";
import { getAuth } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

import { FIREBASE_FIRESTORE } from "../firebaseConfig";
import { useService } from "../components/contexts/ServiceContext";
import {
  FirestoreWorkHoursSchema,
  validateWorkHoursSchema,
} from "../validation/firestoreSchemas.sec";

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
  lastUpdatedDate?: string;

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

  // load state from firestore
  loadState: async () => {
    const { serviceId } = useService();
    if (!serviceId) return;
    const user = getAuth().currentUser;
    if (!user) {
      console.log("No user found, skipping loadState");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        serviceId,
        "WorkHours",
        today
      );

      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log("Document does not exist");
        return;
      }

      const raw = docSnap.data();
      const parsed = FirestoreWorkHoursSchema.safeParse(raw);

      if (!parsed.success) {
        console.error("Invalid WorkHours doc:", parsed.error);
        return;
      }

      const data = parsed.data;
      set({
        currentDocId: data.currentDocId ?? today,
        lastUpdatedDate: data.lastUpdatedDate ?? today,
        elapsedTime: data.elapsedTime ?? 0,
        isWorking: data.isWorking ?? false,
        startWorkTime: data.startWorkTime ?? null,
      });
    } catch (error) {
      console.error("Error loading state:", error);
    }
  },

  // save state to firestore
  saveState: async () => {
    const { serviceId } = useService();
    if (!serviceId) return;
    const user = getAuth().currentUser;
    if (!user) {
      console.log("No user found, skipping saveState");
      return;
    }

    try {
      const state = get();
      const today = new Date().toISOString().split("T")[0];

      const stateToSave = {
        elapsedTime: state.elapsedTime,
        isWorking: state.isWorking,
        startWorkTime: state.startWorkTime,
        currentDocId: state.currentDocId,
        lastUpdatedDate: today,
      };

      // validate the schema
      const valid = validateWorkHoursSchema(stateToSave);
      if (!valid) {
        console.error("Invalid WorkHours state:", stateToSave);
        return; // skip saving if invalid
      }

      const docRef = doc(
        FIREBASE_FIRESTORE,
        "Users",
        user.uid,
        "Services",
        serviceId,
        "WorkHours",
        state.currentDocId || today
      );

      await setDoc(docRef, stateToSave);
    } catch (error) {
      console.error("Error saving state:", error);
    }
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
