# Build VC Model Card Component - Instructions for Coding Agent

## What to Build

**2 Components:**
1. `VCModelCard.tsx` - Display VC Model with vertical timeline
2. `CreateVCModelDialog.tsx` - Form to create new VC Model

## VCModelCard Component

**Location:** `src/components/vc-models/VCModelCard.tsx`

**Props:**
```typescript
interface VCModelCardProps {
  vcModel: {
    id: string;
    model_code: string;
    model_name: string;
    status: 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED';
  };
  flmProgress?: {
    bvs_complete: boolean;
    l0_complete: boolean;
    l1_complete: boolean;
    l2_complete: boolean;
    current_step?: 'BVS' | 'L0' | 'L1' | 'L2' | 'BLUEPRINT';
  };
  onContinue?: () => void;
}
```

**Design Reference:** Use `/mnt/user-data/outputs/VCModelCard_Vertical.html` as visual template

**Key Features:**
- Gradient header showing model name, code, status
- Progress bar (calculate from completed steps)
- Vertical timeline with 7 steps: BVS → L0 → L1 → L2 → L3 → L4 → Blueprint
- Visual states:
  - Complete: Green circle with checkmark
  - In Progress: Blue pulsing circle
  - Locked: Grey circle
- Connected lines between steps (green for complete, grey for pending)
- "Continue" button at bottom (only show if IN_PROGRESS)

**Dependencies:**
- Use `lucide-react` for icons
- Tailwind CSS for styling
- Match the gradient, colors, and spacing from reference HTML

## CreateVCModelDialog Component

**Location:** `src/components/vc-models/CreateVCModelDialog.tsx`

**Props:**
```typescript
interface CreateVCModelDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (vcModel: VCModel) => void;
}
```

**Form Fields:**
- Model Name (required, text input)
- Description (optional, textarea)

**API Call:**
```typescript
const response = await fetch('/api/vc-models', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model_name: formData.name,
    description: formData.description
  })
});
```

**Features:**
- Dialog/modal overlay
- Form validation (name required)
- Loading state during API call
- Error handling with toast/message
- Close on success, call onSuccess callback

## Files to Create

```
src/components/vc-models/
  ├── VCModelCard.tsx
  ├── CreateVCModelDialog.tsx
  └── index.ts (export both components)
```

## Integration Notes

- VCModelCard will be used in workspace dashboard to display user's models
- CreateVCModelDialog triggered by "Create VC Model" button
- Both components should be responsive (mobile-first)
- Use existing Supabase auth context for stakeholder_id

## Testing

After building, test:
1. Empty state (INITIATED, no progress)
2. In progress state (some steps complete)
3. Complete state (all steps done)
4. Create new model via dialog

**Reference the HTML file for exact styling, colors, and layout!**
