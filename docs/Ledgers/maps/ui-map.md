# UI Map

## Screens

### EmptyState (no workspace open)
- Recent workspaces list (clickable)
- "Open Workspace" button
- Settings gear icon in title bar

### Main View (workspace open)
- **TitleBar**: workspace name, context graph toggle, settings gear
- **ContextGraph**: force-directed context visualization
- **RoomModeTabs**: Single/Council mode switch with role count indicator and mode description hints
- **CouncilRoom**: message thread with moderator/role/user messages, collapsible role messages, jump-to-message, streaming indicators
- **FloatingCouncilPanel**: right-side panel (280px) with active roles, suggested perspectives, sources, outputs, memory
- **TerminalPanel**: xterm.js + PTY, resizable (drag handle, 100px–60vh, default 250px), Ctrl+` toggle
- **Composer**: message input with ref chips + perspective chips, send button

## FloatingCouncilPanel Sections

### Active Roles (during/after round)
- Role cards with stream state (pending/running/done/error)
- Role history (previous round summaries)
- Stop/Remove controls
- Progress indicator during running phase

### Suggested Perspectives (after completion)
- **Primary mode**: Kernel routing suggestions with scores and reasons (from `suggestedPerspectives`)
- **Fallback mode**: Client-side tag-count scoring (local/demo mode)
- Each card: name, type badge, reason/subtitle, "Add" button → composer chip

### Sources
- Accordion with reference documents

### Outputs
- Accordion with generated output files

### Memory
- Accordion with memory candidate count

## Composer Features

### Reference Chips
- Added via RefPicker overlay
- Click to remove

### Perspective Chips (P1-A)
- Added from SuggestedRolesSection "Add" button
- Rendered as `+RoleName` chips above reference chips
- Converted to `ExplicitRoleRequest[]` on send, consumed by kernel routing
- Cleared immediately on send

## RoomModeTabs

### Single Mode
- 1 role, no cross-examination
- Hint: "One role, no cross-examination"

### Council Mode
- Multiple roles with cross-examination
- Role count from settings
- Hint: "Multiple roles, cross-examination"

## Modals/Overlays

### SettingsModal
- Provider selector (Mock / OpenAI Compatible)
- Model input
- Base URL input
- API Key input (password) + Clear button + status badge
- Test Connection button
- Advanced: timeout, max output tokens
- Save button

### RefPicker
- Document list from workspace
- Click to add reference

## RoleMessage Component

### Display
- Catalog-driven metadata via `roleMetaMap` (useMemo on roles + colors)
- Stable hash colors via `getRoleColor()` from palettes
- Avatar with first letter, colored border
- Name + subtitle + timestamp
- Collapsed preview with graphSummary badge
- Expanded view with thinking block (char count, markdown), message content, copy button

### Error Messages
- Red error icon with error code
- Error message body

## Interactions

1. **Open workspace** → EmptyState → select folder or click recent → main view
2. **Send message** → Composer → council round → messages stream into CouncilRoom
3. **Add reference** → RefPicker overlay → select doc → chip appears in Composer
4. **Add perspective** → FloatingPanel suggested section → "Add" → chip appears in Composer
5. **Settings** → gear icon → SettingsModal → save/test/close
6. **Auto-open** → on mount, loads most recent workspace if exists
7. **Terminal** → Ctrl+` toggle → resizable terminal panel at bottom
8. **Room mode** → RoomModeTabs → Single/Council switch
