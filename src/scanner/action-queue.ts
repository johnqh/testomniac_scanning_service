export interface QueuedAction {
  id: number;
  type: string;
  status: string;
  startingPageStateId?: number;
  actionableItemId?: number;
  [key: string]: unknown;
}

export class ActionQueue {
  private actions: QueuedAction[] = [];
  private completedIds = new Set<number>();

  add(action: QueuedAction): void {
    this.actions.push(action);
  }

  next(): QueuedAction | undefined {
    return this.actions.find(a => !this.completedIds.has(a.id));
  }

  complete(id: number): void {
    this.completedIds.add(id);
  }

  hasOpen(): boolean {
    return this.actions.some(a => !this.completedIds.has(a.id));
  }

  openCount(): number {
    return this.actions.filter(a => !this.completedIds.has(a.id)).length;
  }
}
