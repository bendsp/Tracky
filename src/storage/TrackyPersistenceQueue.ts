type PendingSave = {
  operation: () => Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export class TrackyPersistenceQueue {
  private tail: Promise<void> = Promise.resolve();
  private replacing = false;
  private pendingDuringReplacement: PendingSave[] = [];

  enqueueSave(operation: () => Promise<void>) {
    if (this.replacing) {
      return new Promise<void>((resolve, reject) => {
        this.pendingDuringReplacement.push({ operation, resolve, reject });
      });
    }
    const queued = this.tail.then(operation);
    this.tail = queued.catch(() => undefined);
    return queued;
  }

  private takePendingSaves() {
    return this.pendingDuringReplacement.splice(0);
  }

  private async flushPendingSaveOperations() {
    const settlements: {
      error?: unknown;
      pending: PendingSave[];
    }[] = [];
    while (this.pendingDuringReplacement.length > 0) {
      const pending = this.takePendingSaves();
      const latest = pending[pending.length - 1];
      try {
        await latest.operation();
        settlements.push({ pending });
      } catch (error) {
        settlements.push({ error, pending });
      }
    }
    return settlements;
  }

  replace<T>(
    operation: () => Promise<T>,
    commitBeforeRelease: (value: T) => void,
  ) {
    if (this.replacing) {
      return Promise.reject(new Error('A Tracky data import is already running'));
    }

    this.replacing = true;
    const previousTail = this.tail;
    let releaseTail!: () => void;
    this.tail = new Promise<void>((resolve) => {
      releaseTail = resolve;
    });

    const queued = previousTail.then(async () => {
      const value = await operation();
      commitBeforeRelease(value);
      return value;
    });
    const settled = queued.then(
      (value) => {
        const pending = this.takePendingSaves();
        this.replacing = false;
        pending.forEach(({ resolve }) => resolve());
        return value;
      },
      async (error: unknown) => {
        const settlements = await this.flushPendingSaveOperations();
        this.replacing = false;
        settlements.forEach(({ error: saveError, pending }) => {
          pending.forEach(({ reject, resolve }) => {
            if (saveError === undefined) resolve();
            else reject(saveError);
          });
        });
        throw error;
      },
    );
    return settled.finally(() => {
      releaseTail();
    });
  }
}
