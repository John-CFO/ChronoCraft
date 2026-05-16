//////////////////////////// raceRunner.ts //////////////////////////////

// This file contains the race runner logic for race condition tests

/////////////////////////////////////////////////////////////////////////

import { RaceBarrier } from "./raceBarrier";

/////////////////////////////////////////////////////////////////////////

export type RaceResult<T> = {
  success: boolean;
  error?: unknown;
  result?: T;
};

export type RaceOptions<T> = {
  participants: number;
  jitterMs?: number;

  operation: (index: number, ctx: RaceContext) => Promise<T>;

  // deterministic injection control (TEST ONLY)
  scheduler?: RaceScheduler;
};

export type RaceContext = {
  index: number;
  tick: number;
  sleep: (ms: number) => Promise<void>;
};

export type RaceScheduler = {
  nextDelay(index: number): number;
  tick(): number;
};

/////////////////////////////////////////////////////////////////////////

export async function runRace<T>({
  participants,
  jitterMs = 0,
  operation,
  scheduler,
}: RaceOptions<T>): Promise<RaceResult<T>[]> {
  const barrier = new RaceBarrier(participants);

  const baseScheduler: RaceScheduler = {
    tick: (() => {
      let t = 0;
      return () => ++t;
    })(),

    nextDelay: (i: number) => i % 2,
  };

  const sch = scheduler ?? baseScheduler;

  const tasks: Promise<RaceResult<T>>[] = Array.from({
    length: participants,
  }).map(async (_, index): Promise<RaceResult<T>> => {
    await barrier.waitForAll();

    const ctx: RaceContext = {
      index,
      tick: sch.tick(),
      sleep: (ms: number) => sleep(ms),
    };

    const delay = jitterMs > 0 ? sch.nextDelay(index) : 0;

    if (delay > 0) {
      await sleep(delay);
    }

    try {
      const result = await operation(index, ctx);

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error,
      };
    }
  });

  return Promise.all(tasks);
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
