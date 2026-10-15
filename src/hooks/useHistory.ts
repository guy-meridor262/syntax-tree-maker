import { useCallback, useReducer } from 'react'

type HistState<T> = {
  past: T[]
  present: T
  future: T[]
}

type HistAction<T> =
  | { type: 'set'; value: T | ((prev: T) => T); record: boolean }
  | { type: 'checkpoint' }
  | { type: 'replace'; value: T }
  | { type: 'undo' }
  | { type: 'redo' }

function clone<T>(v: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T)
}

function reducer<T>(state: HistState<T>, action: HistAction<T>): HistState<T> {
  switch (action.type) {
    case 'set': {
      const value =
        typeof action.value === 'function'
          ? (action.value as (p: T) => T)(state.present)
          : action.value
      if (!action.record) {
        return { ...state, present: value }
      }
      const past = [...state.past, state.present]
      return {
        past: past.length > 100 ? past.slice(-100) : past,
        present: value,
        future: [],
      }
    }
    case 'checkpoint': {
      const past = [...state.past, clone(state.present)]
      return {
        ...state,
        past: past.length > 100 ? past.slice(-100) : past,
        future: [],
      }
    }
    case 'replace':
      return { past: [], present: action.value, future: [] }
    case 'undo': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [...state.future, state.present],
      }
    }
    case 'redo': {
      if (state.future.length === 0) return state
      const next = state.future[state.future.length - 1]
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(0, -1),
      }
    }
    default:
      return state
  }
}

export function useHistory<T>(initial: T) {
  const [state, dispatch] = useReducer(reducer<T>, {
    past: [],
    present: initial,
    future: [],
  })

  const set = useCallback((next: T | ((prev: T) => T), record = true) => {
    dispatch({ type: 'set', value: next, record })
  }, [])

  const checkpoint = useCallback(() => {
    dispatch({ type: 'checkpoint' })
  }, [])

  const replace = useCallback((next: T) => {
    dispatch({ type: 'replace', value: next })
  }, [])

  const undo = useCallback(() => {
    dispatch({ type: 'undo' })
  }, [])

  const redo = useCallback(() => {
    dispatch({ type: 'redo' })
  }, [])

  return {
    present: state.present,
    set,
    checkpoint,
    replace,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}
