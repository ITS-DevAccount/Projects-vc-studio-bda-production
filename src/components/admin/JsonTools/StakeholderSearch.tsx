'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ChevronDown } from 'lucide-react'

interface Stakeholder {
  id: string
  reference: string
  name: string
}

interface Props {
  value: string
  onChange: (ref: string) => void
  disabled?: boolean
}

export default function StakeholderSearch({ value, onChange, disabled }: Props) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [filtered, setFiltered] = useState<Stakeholder[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load all stakeholders on mount
  useEffect(() => {
    const loadStakeholders = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('stakeholders')
        .select('id, reference, name')
        .order('reference', { ascending: true })

      if (!error && data) {
        setStakeholders(data)
        setFiltered(data)
      }
      setLoading(false)
    }

    loadStakeholders()
  }, [])

  // Filter stakeholders based on input
  const handleInputChange = (searchValue: string) => {
    onChange(searchValue)
    
    if (!searchValue.trim()) {
      setFiltered(stakeholders)
    } else {
      const term = searchValue.toLowerCase()
      setFiltered(
        stakeholders.filter(s =>
          s.reference.toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(term)
        )
      )
    }
    
    setIsOpen(true)
  }

  // Handle selection
  const handleSelect = (stakeholder: Stakeholder) => {
    onChange(stakeholder.reference)
    setIsOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Search Reference
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          placeholder="Type to search (e.g., STK-001)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 pr-10"
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Dropdown list */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-gray-500 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-2 text-gray-500 text-sm">No stakeholders found</div>
          ) : (
            filtered.map(stakeholder => (
              <button
                key={stakeholder.id}
                onClick={() => handleSelect(stakeholder)}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="font-mono font-semibold text-blue-600">{stakeholder.reference}</div>
                <div className="text-sm text-gray-600">{stakeholder.name}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}






