export interface LoopGuardOptions {
  maxActionsPerPageState?: number;
  maxTotalActions?: number;
  maxPages?: number;
}

export class LoopGuard {
  private signatures = new Set<string>();
  private pageStateCounts = new Map<number, number>();
  private totalActions = 0;
  private maxPerState: number;
  private maxTotal: number;

  constructor(options: LoopGuardOptions = {}) {
    this.maxPerState = options.maxActionsPerPageState ?? 200;
    this.maxTotal = options.maxTotalActions ?? 5000;
  }

  private sig(type: string, itemId: number, pageStateId: number): string {
    return `${type}:${itemId}:${pageStateId}`;
  }

  shouldCreate(type: string, itemId: number, pageStateId: number): boolean {
    if (this.totalActions >= this.maxTotal) return false;
    const count = this.pageStateCounts.get(pageStateId) || 0;
    if (count >= this.maxPerState) return false;
    if (this.signatures.has(this.sig(type, itemId, pageStateId))) return false;
    return true;
  }

  record(type: string, itemId: number, pageStateId: number): void {
    this.signatures.add(this.sig(type, itemId, pageStateId));
    this.pageStateCounts.set(
      pageStateId,
      (this.pageStateCounts.get(pageStateId) || 0) + 1
    );
    this.totalActions++;
  }

  getTotalActions(): number {
    return this.totalActions;
  }
}
