/**
 * Apex EDA - Transaction & Undo/Redo Engine
 * Handles atomic state transitions with invertible action history.
 */

export interface Action<T> {
  name: string;
  apply: (state: T) => T;
  invert: (state: T) => T;
}

export class TransactionManager<T> {
  private undoStack: Action<T>[] = [];
  private redoStack: Action<T>[] = [];
  private maxHistory: number = 100;
  private isExecuting: boolean = false;

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory;
  }

  public execute(currentState: T, action: Action<T>): T {
    if (this.isExecuting) return currentState;
    this.isExecuting = true;
    try {
      const nextState = action.apply(currentState);
      this.undoStack.push(action);
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
      this.redoStack = []; // clear redo stack on new action
      return nextState;
    } finally {
      this.isExecuting = false;
    }
  }

  public undo(currentState: T): { state: T; undoneAction?: Action<T> } {
    if (this.undoStack.length === 0) return { state: currentState };
    const action = this.undoStack.pop()!;
    const previousState = action.invert(currentState);
    this.redoStack.push(action);
    return { state: previousState, undoneAction: action };
  }

  public redo(currentState: T): { state: T; redoneAction?: Action<T> } {
    if (this.redoStack.length === 0) return { state: currentState };
    const action = this.redoStack.pop()!;
    const nextState = action.apply(currentState);
    this.undoStack.push(action);
    return { state: nextState, redoneAction: action };
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
