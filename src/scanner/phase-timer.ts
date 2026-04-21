export class PhaseTimer {
  private startTime = Date.now();
  private phases = new Map<string, { start: number; end?: number }>();

  startPhase(name: string): void {
    this.phases.set(name, { start: Date.now() });
  }

  endPhase(name: string): number {
    const phase = this.phases.get(name);
    if (!phase) throw new Error(`Phase "${name}" not started`);
    phase.end = Date.now();
    return phase.end - phase.start;
  }

  totalElapsed(): number {
    return Date.now() - this.startTime;
  }

  getAllDurations(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [name, phase] of this.phases) {
      if (phase.end) {
        result[name] = phase.end - phase.start;
      }
    }
    return result;
  }
}
