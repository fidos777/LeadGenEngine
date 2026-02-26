# Caller View Design

## Overview

A simplified mobile-first view for non-technical callers to work through a company queue. Shows company cards with one-tap actions to log call outcomes.

## Requirements

- Show: company name, phone, zone, category
- One-click to log call_attempted
- One-click to log contact_identified (prompts for name + role)
- One-click to log not_interested (marks as outreached)
- Sort: companies with direct phone first, then by zone proximity
- Filter: zone dropdown
- Mobile-optimized: no sidebar, no metadata panel, just cards + buttons

## Architecture

```
app/
└── caller/
    ├── layout.tsx     # Minimal layout, dark theme, full viewport
    └── page.tsx       # Main caller interface (client component)
```

Standalone route outside `(dashboard)` group for clean mobile experience.

## Data Source

- Fetch from existing `/api/v1/leads` endpoint
- Filter: `status=identified` (fresh leads to call)
- Join: company data (name, zone, sector)
- Join: contact data (phone, if available)

## Sorting Logic

1. **Phone priority**: Companies with contact.phone or company.phone first
2. **Zone priority** (fixed order):
   - Klang (priority 1)
   - Shah Alam (priority 2)
   - Rawang (priority 3)
   - Semenyih (priority 4)
   - Others alphabetically (priority 5+)

## Components

### CallerPage (page.tsx)
- Fetches leads on mount
- Manages filter state (selected zone)
- Sorts and renders CompanyCard list

### CompanyCard
- Company name (bold, 18px)
- Phone number (tel: link for tap-to-call)
- Zone badge (pill, muted)
- Sector (small text)
- 3 action buttons in row

### ZoneFilter
- Dropdown at page top
- Options: All, Klang, Shah Alam, Rawang, Semenyih, Other
- Filters visible cards

### ContactModal
- Triggered by "Contact Found" button
- Two inputs: Name, Role
- Submit logs activity and closes

## Action Buttons

| Button | Label | Icon | Action |
|--------|-------|------|--------|
| Called | "Called" | 📞 | Log `call_attempted` |
| Contact Found | "Contact" | ✅ | Open modal → log `contact_identified` |
| Not Interested | "Not Int." | ❌ | Log `outreached` with note |

## API Integration

All actions use existing endpoint:
```
POST /api/v1/leads/[id]/execute
```

### Payloads

**Called:**
```json
{
  "activity": {
    "outcome": "call_attempted"
  }
}
```

**Contact Found:**
```json
{
  "activity": {
    "outcome": "contact_identified",
    "intel_gathered": "Name: John Smith, Role: Factory Manager"
  }
}
```

**Not Interested:**
```json
{
  "activity": {
    "outcome": "not_interested"
  },
  "new_status": "outreached"
}
```

## UI States

- **Loading**: Skeleton cards
- **Empty**: "No leads to call" message
- **Error**: Retry button
- **Action pending**: Button shows spinner, disabled
- **Action complete**: Card shows checkmark, fades/moves to bottom

## Styling

- Dark theme (bg-black, text-white)
- Large touch targets (min 44px)
- Full-width cards with 16px padding
- Action buttons: equal width, stacked on very small screens

## Error Handling

- API errors show toast notification
- Failed actions can be retried
- Offline: show warning banner (no offline support in v1)

## Future Enhancements (Not in v1)

- Offline support with service worker
- Call duration tracking
- Voice notes
- Bulk actions
