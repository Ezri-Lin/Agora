# UI Map

## Screens

### EmptyState (no workspace open)
- Recent workspaces list (clickable)
- "Open Workspace" button
- Settings gear icon in title bar

### Main View (workspace open)
- **TitleBar**: workspace name, context graph toggle, settings gear
- **ContextGraph**: visual context (placeholder)
- **CouncilRoom**: message thread with moderator/role/user messages
- **Inspector**: right panel with 4 tabs (Participants, References, Outputs, Context)
- **Composer**: message input with ref chips, send button

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

## Interactions

1. **Open workspace** → EmptyState → select folder or click recent → main view
2. **Send message** → Composer → council round → messages appear in CouncilRoom
3. **Add reference** → RefPicker overlay → select doc → chip appears in Composer
4. **Settings** → gear icon → SettingsModal → save/test/close
5. **Auto-open** → on mount, loads most recent workspace if exists
