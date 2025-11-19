'use client'

import { create } from 'zustand'

interface JsonSearchState {
  selectedReference: string
  selectedSource: 'stakeholder' | 'workflow'
  setSelectedReference: (ref: string) => void
  setSelectedSource: (source: 'stakeholder' | 'workflow') => void
  clearContext: () => void
}

export const useJsonSearchContext = create<JsonSearchState>((set) => ({
  selectedReference: '',
  selectedSource: 'stakeholder',
  setSelectedReference: (ref: string) => set({ selectedReference: ref }),
  setSelectedSource: (source: 'stakeholder' | 'workflow') => set({ selectedSource: source }),
  clearContext: () => set({ selectedReference: '', selectedSource: 'stakeholder' })
}))






