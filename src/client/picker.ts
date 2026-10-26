/** Plugin-owned inline picker state shared by the assistant action and the input dock. */
import { createSnapshotStore, type ObservableSnapshot } from '@deepseek-ai/dsh-client-store'

/** Whether the inline picker is showing, and which message it was opened from. */
export interface PickerState {
  readonly open: boolean
  readonly focus: string | null
}

/** The picker's owned store face. */
export interface PickerStore {
  readonly source: ObservableSnapshot<PickerState>
  /**
   * Show the picker above the composer.
   * @param focus - durable message identity to preselect.
   */
  open(focus?: string): void
  close(): void
}

/**
 * Create one picker store owned by a plugin registration.
 * @returns the store face injected into the action and dock entries.
 */
export function createPickerStore(): PickerStore {
  const store = createSnapshotStore<PickerState>({ open: false, focus: null })
  return {
    source: store,
    open(focus) {
      store.set({ open: true, focus: focus ?? null })
    },
    close() {
      store.set({ open: false, focus: null })
    },
  }
}
