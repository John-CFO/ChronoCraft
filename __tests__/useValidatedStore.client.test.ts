//////////////////// useValidatedStore.client.test.ts //////////////////////

// This file is used to test the validated actions for the global timetracking state

//////////////////////////////////////////////////////////////////////////////

import {
  useValidatedStore,
  __setUseStoreForTest,
} from "../validation/useValidatedStore";
import * as schemas from "../validation/timeTrackingStateSchemas";

//////////////////////////////////////////////////////////////////////////////

describe("useValidatedStore", () => {
  let mockStore: any;
  let storeWrapper: ReturnType<typeof useValidatedStore>;

  beforeEach(() => {
    mockStore = {
      projects: {},
      currentProjectId: null,
      rateInput: 0,
      appState: {},
      isInitialized: true,
      isTracking: false,
      setProjectData: jest.fn(),
      setTimerAndEarnings: jest.fn(),
      startTimer: jest.fn(),
      stopTimer: jest.fn(),
      resetAll: jest.fn(),
      setAppState: jest.fn(),
      setHourlyRate: jest.fn(),
      updateTimer: jest.fn(),
      setTotalEarnings: jest.fn(),
      getProjectState: jest.fn(),
      pauseTimer: jest.fn(),
      calculateEarnings: jest.fn(),
      setProjectId: jest.fn(),
      setRateInput: jest.fn(),
      setIsInitialized: jest.fn(),
      setIsTracking: jest.fn(),
      getProjectTrackingState: jest.fn(),
      getProjectId: jest.fn(),
      setProjectTime: jest.fn(),
      setLastStartTime: jest.fn(),
      setOriginalStartTime: jest.fn(),
      subscribe: jest.fn(),
      getState: jest.fn(),
    };

    __setUseStoreForTest(mockStore); // inject mock
    storeWrapper = useValidatedStore();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls store.setProjectData on valid input", () => {
    jest
      .spyOn(schemas, "validateSetProjectData")
      .mockImplementation((data) => data as any);
    storeWrapper.setProjectData("validProject", { id: "validProject" });
    expect(mockStore.setProjectData).toHaveBeenCalledWith("validProject", {
      id: "validProject",
    });
  });

  it("calls store.setTimerAndEarnings with validated data", () => {
    jest
      .spyOn(schemas, "validateTimerAndEarnings")
      .mockImplementation((data) => data as any);
    storeWrapper.setTimerAndEarnings("validProject", 100, 200);
    expect(mockStore.setTimerAndEarnings).toHaveBeenCalledWith(
      "validProject",
      100,
      200
    );
  });

  it("startTimer / stopTimer calls mock store", () => {
    storeWrapper.startTimer("proj1");
    storeWrapper.stopTimer("proj1");
    expect(mockStore.startTimer).toHaveBeenCalledWith("proj1");
    expect(mockStore.stopTimer).toHaveBeenCalledWith("proj1");
  });
});
