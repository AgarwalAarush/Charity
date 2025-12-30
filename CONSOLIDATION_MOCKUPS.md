# Event Screen Consolidation Options - Visual Mockups

## Current State

### Home Screen (`/home`)
- Shows upcoming matches, team events, and personal activities
- Filters: Team selector, Event type buttons (Matches, Practice, Warmup, Other)
- Displays availability summaries for team events
- Shows lineup status for matches
- Quick availability updates inline

### Calendar Screen (`/calendar`)
- Week/Month/List view toggle
- Shows all events (matches, team events, personal activities)
- Filters: Team chips, Event type buttons, Personal activities toggle
- Bulk select mode for availability updates
- Can add events (captains only)

### Activities Screen (`/activities`)
- Shows only personal activities
- Separates "Created" vs "Invited To"
- Filters: Activity type, Upcoming/Past
- Can create new activities

---

## Option 1: Merge Activities into Calendar (Recommended)

**Concept:** Keep Home screen unchanged. Merge Activities functionality into Calendar. Calendar becomes the unified view for all events with a view selector.

**What Stays:**
- ✅ Home screen (`/home`) - **UNCHANGED** - remains as dashboard with upcoming items
- ✅ Calendar screen (`/calendar`) - enhanced with Activities view

**What Changes:**
- ❌ Activities screen (`/activities`) - removed, functionality moved to Calendar

### Calendar Screen Layout:

```
┌─────────────────────────────────────────────────────────┐
│ Calendar                                    [Notifications]│
├─────────────────────────────────────────────────────────┤
│ [← Back]                    [Quick Availability]        │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [Today] [Add Event] [Week|Month|List] [Bulk Select]│ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ View: [All Events ▼] [Personal Activities ▼]     │ │
│ │  └─ Shows: All | Team Events Only | Personal Only  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Teams: [Team A] [Team B] [Team C]                  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Event Types: [Matches] [Practice] [Warmup] [Other]│ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Personal Activities: [Show] [Hide]                 │ │
│ │ ☑ Hide events I'm organizing (not participating)   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ When "Personal Activities" view is selected:       │ │
│ │                                                     │ │
│ │ Activities I Created (3)                           │ │
│ │ ┌───────────────────────────────────────────────┐ │ │
│ │ │ [Scrimmage] Tennis Practice                    │ │ │
│ │ │ 📅 Jan 15, 2025  ⏰ 6:00 PM                   │ │ │
│ │ │ 👥 3 attendees: John, Sarah, Mike              │ │ │
│ │ └───────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ Activities I'm Invited To (2)                      │ │
│ │ ┌───────────────────────────────────────────────┐ │ │
│ │ │ [Lesson] Private Lesson                        │ │ │
│ │ │ 📅 Jan 16, 2025  ⏰ 2:00 PM                   │ │ │
│ │ │ [Pending] Badge                                │ │ │
│ │ └───────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ [Calendar View: Week/Month/List based on selection]     │
└─────────────────────────────────────────────────────────┘
```

**Changes:**
- Add "View" selector at top: "All Events" | "Team Events Only" | "Personal Activities Only"
- When "Personal Activities Only" is selected, show the grouped view (Created vs Invited)
- Keep all existing calendar functionality
- Remove `/activities` route, redirect to `/calendar?view=personal`

**Pros:**
- Single source of truth for all events
- Reduces navigation complexity
- Calendar already shows personal activities, just needs better organization
- Maintains all existing features

**Cons:**
- Calendar screen becomes more complex
- Need to handle different views elegantly

---

## Option 2: Merge Activities into Home

**Concept:** Make Home the dashboard that shows everything, with better organization for personal activities.

### Home Screen Layout:

```
┌─────────────────────────────────────────────────────────┐
│ Home                                         [Notifications]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Team: [Team A ▼]                                   │ │
│ │ Event Types: [All] [Matches] [Practice] [Warmup]  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ UPCOMING MATCHES                                    │ │
│ │ ┌───────────────────────────────────────────────┐ │ │
│ │ │ [Match] vs Opponents                           │ │ │
│ │ │ 📅 Mon 1/15  ⏰ 6:00 PM  [Home]                │ │ │
│ │ │ Lineup: S1: John & Sarah                       │ │ │
│ │ │ [Available ▼]                                  │ │ │
│ │ └───────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ TEAM EVENTS                                        │ │
│ │ ┌───────────────────────────────────────────────┐ │ │
│ │ │ [Practice] Team Practice                      │ │ │
│ │ │ 📅 Tue 1/16  ⏰ 7:00 PM                      │ │ │
│ │ │ Availability: ✅ 5  ❌ 2  ❓ 1  ⚪ 3          │ │ │
│ │ │ [Available ▼]                                  │ │ │
│ │ └───────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ PERSONAL ACTIVITIES                                │ │
│ │ [+ Create Activity]                               │ │
│ │                                                     │ │
│ │ Activities I Created (3)                           │ │
│ │ ┌───────────────────────────────────────────────┐ │ │
│ │ │ [Scrimmage] Tennis Practice                    │ │ │
│ │ │ 📅 Jan 15, 2025  ⏰ 6:00 PM                   │ │ │
│ │ │ 👥 Playing with: John, Sarah                  │ │ │
│ │ │ [Available ▼]                                  │ │ │
│ │ └───────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ Activities I'm Invited To (2)                      │ │
│ │ ┌───────────────────────────────────────────────┐ │ │
│ │ │ [Lesson] Private Lesson                        │ │ │
│ │ │ 📅 Jan 16, 2025  ⏰ 2:00 PM                   │ │ │
│ │ │ [Pending]                                      │ │ │
│ │ └───────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ [View All in Calendar →]                                │
└─────────────────────────────────────────────────────────┘
```

**Changes:**
- Add "Personal Activities" section to Home
- Show "Created" vs "Invited To" grouping
- Add "Create Activity" button in Personal Activities section
- Add link to Calendar for full view
- Remove `/activities` route

**Pros:**
- Home becomes comprehensive dashboard
- Users see everything at a glance
- Natural flow: overview → detail

**Cons:**
- Home screen becomes very long
- Less space for each item
- Calendar still needed for time-based views

---

## Option 3: Unified Events Screen with Tabs

**Concept:** Replace ALL THREE screens (Home, Calendar, Activities) with a single new unified screen that has tabs.

**What Stays:**
- ❌ Nothing - all three screens are replaced

**What Changes:**
- ❌ Home screen (`/home`) - **REPLACED** by "Overview" tab
- ❌ Calendar screen (`/calendar`) - **REPLACED** by "Calendar" tab  
- ❌ Activities screen (`/activities`) - **REPLACED** by "Personal" tab
- ✅ New unified screen (`/events`) - contains all three views as tabs

### New Unified Events Screen Layout:

```
┌─────────────────────────────────────────────────────────┐
│ Events                                       [Notifications]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [Overview] [Calendar] [Personal]                    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ When "Overview" tab selected:                     │ │
│ │                                                     │ │
│ │ Team: [Team A ▼]                                   │ │
│ │ Event Types: [All] [Matches] [Practice] [Warmup]  │ │
│ │                                                     │ │
│ │ UPCOMING MATCHES (3)                               │ │
│ │ [Match cards...]                                   │ │
│ │                                                     │ │
│ │ TEAM EVENTS (5)                                    │ │
│ │ [Event cards...]                                   │ │
│ │                                                     │ │
│ │ PERSONAL ACTIVITIES (4)                             │ │
│ │ [Activity cards...]                                │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ When "Calendar" tab selected:                     │ │
│ │                                                     │ │
│ │ [Today] [Add Event] [Week|Month|List] [Bulk]      │ │
│ │                                                     │ │
│ │ [Week/Month/List view of calendar]                │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ When "Personal" tab selected:                      │ │
│ │                                                     │ │
│ │ [+ Create Activity]                               │ │
│ │ Type: [All Types ▼]  Status: [Upcoming ▼]        │ │
│ │                                                     │ │
│ │ Activities I Created (3)                           │ │
│ │ [Activity cards...]                                │ │
│ │                                                     │ │
│ │ Activities I'm Invited To (2)                      │ │
│ │ [Activity cards...]                                │ │
│ └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Changes:**
- Create new `/events` route
- Three tabs: Overview (Home-like), Calendar, Personal (Activities-like)
- Replace `/home`, `/calendar`, `/activities` with this unified screen
- Update bottom nav to show "Events" instead of three separate items

**Pros:**
- Single unified interface
- Clear separation of concerns via tabs
- Users can switch between views easily
- Reduces navigation complexity

**Cons:**
- Major refactoring required
- Need to merge three large components
- May be overwhelming for users
- Loses the "Home" concept as landing page

---

## Option 4: Keep Home, Merge Calendar + Activities

**Concept:** Keep Home as dashboard, merge Calendar and Activities into a single "Calendar & Activities" screen.

**What Stays:**
- ✅ Home screen (`/home`) - **UNCHANGED** - remains as dashboard with upcoming items
- ✅ Calendar screen (`/calendar`) - enhanced with Activities view

**What Changes:**
- ❌ Activities screen (`/activities`) - removed, functionality moved to Calendar

### Home Screen (unchanged):
- Shows upcoming items
- Quick overview

### Enhanced Calendar Screen:

```
┌─────────────────────────────────────────────────────────┐
│ Calendar                                    [Notifications]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [Today] [Add Event] [Week|Month|List] [Bulk Select]│ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ View: [All Events] [Team Events] [Personal Only]   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Teams: [Team A] [Team B]                           │ │
│ │ Event Types: [Matches] [Practice] [Warmup] [Other]│ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ When "Personal Only" selected:                     │ │
│ │                                                     │ │
│ │ [+ Create Activity]                                 │ │
│ │ Type: [All Types ▼]  Status: [Upcoming ▼]        │ │
│ │                                                     │ │
│ │ Activities I Created (3)                           │ │
│ │ [Activity cards in list view...]                  │ │
│ │                                                     │ │
│ │ Activities I'm Invited To (2)                      │ │
│ │ [Activity cards in list view...]                  │ │
│ │                                                     │ │
│ │ [Or show in Week/Month/List calendar view]        │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ [Calendar view when "All Events" or "Team Events"]     │
└─────────────────────────────────────────────────────────┘
```

**Changes:**
- Merge `/calendar` and `/activities` into `/calendar`
- Add view toggle: "All Events" | "Team Events" | "Personal Only"
- When "Personal Only", show the grouped Activities view
- Keep `/home` separate as dashboard
- Update bottom nav: Remove "Activities", keep "Calendar"

**Pros:**
- Home stays as quick dashboard
- Calendar becomes comprehensive event management
- Reduces one navigation item
- Less disruptive than full merge

**Cons:**
- Still have some overlap between Home and Calendar
- Calendar screen needs to handle both views well

---

## Option 5: Smart Home with Embedded Calendar

**Concept:** Make Home the primary screen with embedded calendar widget, move Activities to Calendar.

### Home Screen Layout:

```
┌─────────────────────────────────────────────────────────┐
│ Home                                         [Notifications]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Team: [Team A ▼]                                   │ │
│ │ Event Types: [All] [Matches] [Practice] [Warmup]  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ UPCOMING (Next 7 Days)                             │ │
│ │ [Match/Event/Activity cards...]                    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 📅 This Week's Calendar                            │ │
│ │ ┌───────────────────────────────────────────────┐ │ │
│ │ │ Mon 1/15    Tue 1/16    Wed 1/17    ...       │ │ │
│ │ │ [Match]     [Practice]  [Activity]            │ │ │
│ │ │ 6:00 PM     7:00 PM     2:00 PM               │ │ │
│ │ └───────────────────────────────────────────────┘ │ │
│ │ [View Full Calendar →]                            │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ PERSONAL ACTIVITIES                                │ │
│ │ [Quick summary: 3 upcoming, 2 pending invites]   │ │
│ │ [View All Activities →]                           │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ [View Full Calendar] [View All Activities]             │
└─────────────────────────────────────────────────────────┘
```

**Changes:**
- Home shows compact calendar widget (week view)
- Add quick links to full Calendar and Activities
- Calendar screen handles full calendar + personal activities view
- Activities screen becomes part of Calendar

**Pros:**
- Home gives quick overview with calendar context
- Users can drill down for details
- Maintains separation of concerns

**Cons:**
- More navigation between screens
- Calendar widget on Home might be too small
- Still have three separate screens conceptually

---

## Recommendation Summary

**Option 1 (Merge Activities into Calendar)** is recommended because:
1. Calendar already shows personal activities, just needs better organization
2. Single unified view for all events
3. Maintains Home as dashboard for quick overview
4. Minimal disruption to existing functionality
5. Reduces navigation complexity (one less bottom nav item)

**Option 4 (Keep Home, Merge Calendar + Activities)** is second choice:
1. Less disruptive than Option 1
2. Maintains Home as landing page
3. Calendar becomes comprehensive event management
4. Still reduces navigation complexity

---

## Key Differences: Option 1 vs Option 3

### Option 1: Merge Activities into Calendar
- **Home Screen**: ✅ **KEPT AS-IS** - remains unchanged at `/home`
- **Calendar Screen**: ✅ Enhanced with Activities view selector
- **Activities Screen**: ❌ Removed, redirects to `/calendar?view=personal`
- **Result**: 2 screens (Home + Calendar)
- **Bottom Nav**: Home | Calendar | (other items)

### Option 3: Unified Events Screen with Tabs
- **Home Screen**: ❌ **REPLACED** - becomes "Overview" tab in new screen
- **Calendar Screen**: ❌ **REPLACED** - becomes "Calendar" tab in new screen
- **Activities Screen**: ❌ **REPLACED** - becomes "Personal" tab in new screen
- **New Screen**: ✅ `/events` with tabs: Overview | Calendar | Personal
- **Result**: 1 screen (Events) replacing all three
- **Bottom Nav**: Events | (other items) - removes Home and Calendar

### Visual Comparison:

**Option 1 Structure:**
```
/home          → Dashboard (unchanged)
/calendar      → Calendar with view selector (All Events | Team Events | Personal Activities)
/activities    → Redirects to /calendar?view=personal
```

**Option 3 Structure:**
```
/events        → New unified screen with tabs:
                 ├─ Overview tab (replaces /home)
                 ├─ Calendar tab (replaces /calendar)
                 └─ Personal tab (replaces /activities)
/home          → Redirects to /events?tab=overview
/calendar      → Redirects to /events?tab=calendar
/activities    → Redirects to /events?tab=personal
```

---

## Key Differences: Option 1 vs Option 4

**Important:** Option 1 and Option 4 are **essentially the same approach** with only minor differences in implementation details.

### Option 1: Merge Activities into Calendar
- **Home Screen**: ✅ **KEPT AS-IS** - remains unchanged at `/home`
- **Calendar Screen**: ✅ Enhanced with Activities view selector
- **View Options**: "All Events" | "Team Events Only" | "Personal Activities Only"
- **Activities Screen**: ❌ Removed, redirects to `/calendar?view=personal`
- **Result**: 2 screens (Home + Calendar)
- **Bottom Nav**: Home | Calendar | (other items)

### Option 4: Keep Home, Merge Calendar + Activities
- **Home Screen**: ✅ **KEPT AS-IS** - remains unchanged at `/home`
- **Calendar Screen**: ✅ Enhanced with Activities view selector
- **View Options**: "All Events" | "Team Events" | "Personal Only"
- **Activities Screen**: ❌ Removed, redirects to `/calendar?view=personal`
- **Result**: 2 screens (Home + Calendar)
- **Bottom Nav**: Home | Calendar | (other items)

### The Only Differences:
1. **Wording**: Option 1 uses "Team Events Only" and "Personal Activities Only", while Option 4 uses "Team Events" and "Personal Only" (slightly shorter labels)
2. **Screen Title**: Option 4 suggests the screen could be titled "Calendar & Activities" instead of just "Calendar" (cosmetic only)

### Conclusion:
**Option 1 and Option 4 are the same approach** - they both:
- Keep Home unchanged
- Merge Activities into Calendar
- Add a view selector to Calendar
- Remove the Activities route

The differences are purely cosmetic (label wording). Both achieve the same result: consolidating Activities into Calendar while keeping Home as a separate dashboard.

