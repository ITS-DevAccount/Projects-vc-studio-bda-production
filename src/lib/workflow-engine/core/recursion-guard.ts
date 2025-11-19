/**
 * Recursion Guard for State Machine
 *
 * Prevents infinite loops in gateway node evaluation by tracking:
 * - Visited nodes in current evaluation path
 * - Maximum recursion depth
 * - Cycle detection
 */

import {
  createCycleDetectedError,
  createMaxRecursionExceededError,
} from '../types/errors'

// ============================================================================
// Configuration
// ============================================================================

export const DEFAULT_MAX_RECURSION_DEPTH = 100

// ============================================================================
// Recursion Guard Interface
// ============================================================================

export interface RecursionGuardState {
  maxDepth: number
  visited: Set<string>
  pathStack: string[]
}

// ============================================================================
// Recursion Guard Class
// ============================================================================

export class RecursionGuard {
  private maxDepth: number
  private visited: Set<string>
  private pathStack: string[]

  constructor(maxDepth: number = DEFAULT_MAX_RECURSION_DEPTH) {
    this.maxDepth = maxDepth
    this.visited = new Set()
    this.pathStack = []
  }

  /**
   * Check if entering a node would violate recursion constraints
   *
   * @param nodeId - Node identifier to check
   * @throws WorkflowError if cycle detected or max depth exceeded
   */
  checkBeforeEnter(nodeId: string): void {
    // Check 1: Max depth exceeded
    if (this.pathStack.length >= this.maxDepth) {
      throw createMaxRecursionExceededError(this.pathStack, this.maxDepth)
    }

    // Check 2: Cycle detected (node already in current path)
    if (this.visited.has(nodeId)) {
      throw createCycleDetectedError(this.pathStack, nodeId)
    }
  }

  /**
   * Register entering a node
   *
   * @param nodeId - Node identifier
   */
  enter(nodeId: string): void {
    this.checkBeforeEnter(nodeId)
    this.visited.add(nodeId)
    this.pathStack.push(nodeId)
  }

  /**
   * Register exiting a node
   */
  exit(): void {
    const nodeId = this.pathStack.pop()
    if (nodeId) {
      this.visited.delete(nodeId)
    }
  }

  /**
   * Get current recursion depth
   */
  getDepth(): number {
    return this.pathStack.length
  }

  /**
   * Get current path
   */
  getPath(): string[] {
    return [...this.pathStack]
  }

  /**
   * Get visited nodes
   */
  getVisited(): string[] {
    return Array.from(this.visited)
  }

  /**
   * Check if node has been visited
   */
  hasVisited(nodeId: string): boolean {
    return this.visited.has(nodeId)
  }

  /**
   * Reset the guard (for new evaluation)
   */
  reset(): void {
    this.visited.clear()
    this.pathStack = []
  }

  /**
   * Get current state (for logging/debugging)
   */
  getState(): RecursionGuardState {
    return {
      maxDepth: this.maxDepth,
      visited: new Set(this.visited),
      pathStack: [...this.pathStack],
    }
  }

  /**
   * Create a checkpoint that can be restored
   */
  checkpoint(): RecursionGuardState {
    return this.getState()
  }

  /**
   * Restore from a checkpoint
   */
  restore(state: RecursionGuardState): void {
    this.maxDepth = state.maxDepth
    this.visited = new Set(state.visited)
    this.pathStack = [...state.pathStack]
  }
}
