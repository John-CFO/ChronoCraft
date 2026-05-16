////////////////// raceBarrier.ts ////////////////////

// This class is used to create a barrier that waits
// for all participants to be ready before starting the race

//////////////////////////////////////////////////////

export class RaceBarrier {
  private readyCount = 0;
  private resolveStart!: () => void;
  private startPromise: Promise<void>;

  constructor(private participants: number) {
    this.startPromise = new Promise((resolve) => {
      this.resolveStart = resolve;
    });
  }

  async waitForAll(): Promise<void> {
    this.readyCount++;

    if (this.readyCount === this.participants) {
      this.resolveStart();
    }

    return this.startPromise;
  }
}
