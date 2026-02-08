# DESIGN: Intelligent Flow System

> **Mission Control Evolution** — From Siloed Tabs to Connected Workspace
> 
> Author: UX-Architect | Date: 2026-02-07 | Status: Design Phase

---

## Executive Summary

Transform Mission Control from 4 disconnected silos (Tasks/Todo/Docs/People) into an **Intelligent Flow** workspace where work items naturally evolve through states, connections form automatically, and users can view their work from multiple perspectives.

### Core Philosophy

> "Work doesn't live in tabs—it flows through states."

Instead of asking "Is this a task or a doc?", the system asks "What stage is this work in?"

---

## Part 1: New Data Model

### 1.1 Universal Work Item

Replace separate data structures with a unified `WorkItem` that can evolve:

```javascript
// NEW: Universal Work Item Schema
{
  // Identity
  "id": "work_1707300000000",
  "type": "idea" | "task" | "doc" | "deliverable",
  
  // Core Content
  "title": "Build user authentication",
  "content": "## Overview\nMarkdown content here...",
  "summary": "Short 1-liner for cards",
  
  // Flow State (replaces status columns)
  "flowState": "ideation" | "exploration" | "committed" | "in_progress" | "review" | "delivered",
  "flowHistory": [
    { "state": "ideation", "at": "2026-02-01T10:00:00Z", "by": "user" },
    { "state": "committed", "at": "2026-02-03T14:30:00Z", "by": "İrtek" }
  ],
  
  // Connections (THE KEY INNOVATION)
  "connections": {
    "spawned_from": "work_123",     // This was created from another item
    "spawns": ["work_456"],         // Items created from this
    "references": ["work_789"],      // Linked items (bidirectional)
    "blocks": [],                    // Blocking relationships
    "blocked_by": []
  },
  
  // People
  "owner": "person_irtek",
  "assignees": ["person_nomura"],
  "watchers": [],
  
  // Time
  "createdAt": "2026-02-01T10:00:00Z",
  "dueAt": "2026-02-15T00:00:00Z",
  "estimatedHours": 8,
  "actualHours": 0,
  
  // Organization
  "project": "dev",
  "tags": ["auth", "security", "p0"],
  "priority": "high",
  
  // Decomposition
  "subtasks": [
    { "id": "sub_001", "title": "Design schema", "done": true },
    { "id": "sub_002", "title": "Implement API", "done": false }
  ],
  
  // Activity
  "comments": [],
  "lastActivityAt": "2026-02-06T14:30:00Z"
}
```

### 1.2 Person Entity

Enhanced person model with workload visibility:

```javascript
{
  "id": "person_irtek",
  "name": "İrtek",
  "handle": "@irtek",
  "avatar": "https://...",
  "role": "owner",
  
  // Computed (derived from work items)
  "workload": {
    "in_progress": 3,
    "committed": 5,
    "review": 2
  },
  "completionRate": 0.78,  // Last 30 days
  
  // Preferences
  "focusAreas": ["dev", "finance"]
}
```

### 1.3 Connection Types

| Type | Meaning | Example |
|------|---------|---------|
| `spawned_from` | This item evolved from another | Doc → Task (one-click convert) |
| `spawns` | Items created from this | Task → Subtasks as separate items |
| `references` | Related items | Task mentions Doc by ID |
| `blocks` | Must complete before | Auth task blocks Dashboard task |
| `blocked_by` | Waiting on another item | (inverse of blocks) |

### 1.4 Auto-Linking Rules

```javascript
const AUTO_LINK_PATTERNS = [
  // Explicit mentions
  { pattern: /\[\[work_(\w+)\]\]/, type: "references" },
  { pattern: /@(\w+)/, type: "assignee_mention" },
  
  // ID patterns  
  { pattern: /task_(\w+)/, type: "references" },
  { pattern: /doc_(\w+)/, type: "references" },
  
  // Semantic (future: AI-powered)
  // { pattern: "similar_keywords", type: "suggested", threshold: 0.7 }
];
```

---

## Part 2: Flow States (Replacing Status Columns)

### 2.1 The Six States

```
┌──────────────────────────────────────────────────────────────────┐
│  💡 IDEATION    🔬 EXPLORATION    📝 COMMITTED                   │
│  ─────────────────────────────────────────────────────────────── │
│  Rough ideas    Research &        Scoped, assigned,             │
│  Notes, docs    prototypes        ready to start                │
│  What-ifs                                                        │
├──────────────────────────────────────────────────────────────────┤
│  🚧 IN PROGRESS    👀 REVIEW    ✅ DELIVERED                     │
│  ─────────────────────────────────────────────────────────────── │
│  Active work       Feedback &      Complete,                     │
│  Someone owns it   iteration       documented                    │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 State Transitions

```javascript
const FLOW_TRANSITIONS = {
  ideation:     { next: ["exploration", "committed"], back: [] },
  exploration:  { next: ["committed", "ideation"], back: ["ideation"] },
  committed:    { next: ["in_progress"], back: ["exploration", "ideation"] },
  in_progress:  { next: ["review", "delivered"], back: ["committed"] },
  review:       { next: ["delivered", "in_progress"], back: ["in_progress"] },
  delivered:    { next: [], back: ["review"] }  // Terminal state
};
```

### 2.3 Type Evolution

Work items can evolve types as they progress:

```
idea (💭) ──────> task (✓) ──────> deliverable (📦)
   │                                     │
   └────────> doc (📄) ─────────────────┘
              (stays as reference)
```

**One-click conversions:**
- Idea → Task: "Make this actionable"
- Task → Deliverable: "Mark as shipped"
- Any → Doc: "Document this"

---

## Part 3: Multiple Views (Replacing Tabs)

### 3.1 View Switcher UI

Replace the tab bar with a view mode selector:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎛️ Mission Control          [🔍 Search...]        [+ New Work] │
│                                                                  │
│  View: [🌊 Flow ▾]  [📊 Pipeline ▾]  [👤 People]  [📅 Timeline] │
│                                                                  │
│  Filter: [All Projects ▾]  [All States ▾]  [All Types ▾]       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Flow View (Default)

Visual swim lanes showing work flowing through states:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 💡 Ideation (4)  │ 🔬 Explore (2)  │ 📝 Committed (5)                    │
├──────────────────┼─────────────────┼─────────────────────────────────────┤
│ ┌──────────────┐ │ ┌─────────────┐ │ ┌─────────────────────────────────┐ │
│ │ 📄 API Ideas │ │ │ 🔍 Auth     │ │ │ ✓ User login                    │ │
│ │    draft     │ │ │   research  │ │ │   @İrtek • Due Feb 10          │ │
│ │              │→│ │             │→│ │   ████████░░ 80%               │ │
│ │  [→ Task]    │ │ │ [→ Commit]  │ │ │   └── Spawned from: API Ideas  │ │
│ └──────────────┘ │ └─────────────┘ │ └─────────────────────────────────┘ │
│ ┌──────────────┐ │                 │ ┌─────────────────────────────────┐ │
│ │ 💭 Gamify    │ │                 │ │ ✓ Dashboard redesign            │ │
│ │   the app?   │ │                 │ │   @Nomura • No due date         │ │
│ └──────────────┘ │                 │ │   ░░░░░░░░░░ 0%                 │ │
│                  │                 │ └─────────────────────────────────┘ │
├──────────────────┴─────────────────┴─────────────────────────────────────┤
│ 🚧 In Progress (3)      │ 👀 Review (1)         │ ✅ Delivered (12)      │
├─────────────────────────┼───────────────────────┼────────────────────────┤
│ ┌─────────────────────┐ │ ┌───────────────────┐ │ ▾ Show 12 completed    │
│ │ ✓ Responsive CSS    │ │ │ ✓ Chat widget    │ │                        │
│ │   @CSS-Architect    │ │ │   Needs feedback │ │ ┌────────────────────┐ │
│ │   ████░░░░░░ 40%    │ │ │   [✓ Approve]    │ │ │ ✓ PWA setup        │ │
│ │   🔗 Linked: 2 docs │ │ │   [↩ Revise]     │ │ │   Shipped Feb 5    │ │
│ └─────────────────────┘ │ └───────────────────┘ │ └────────────────────┘ │
└─────────────────────────┴───────────────────────┴────────────────────────┘
```

**Key features:**
- Drag items between states
- Progress bar from subtask completion
- Connection badges showing linked items
- Quick actions: "→ Task", "✓ Approve", "↩ Revise"

### 3.3 People View

Work organized by person, showing their full workload:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 👤 People View                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ 👤 İrtek                                      Overall: ████░░ 65%  │   │
│ │ Owner • 8 items active                                             │   │
│ ├────────────────────────────────────────────────────────────────────┤   │
│ │ 🚧 In Progress (3)           │ 📝 Committed (4)    │ 👀 Review (1) │   │
│ │ • User login ████████░░      │ • Dashboard         │ • Chat widget │   │
│ │ • API refactor ██░░░░░░░░    │ • Mobile app        │               │   │
│ │ • Docs update ██████░░░░     │ • Voice input       │               │   │
│ │                              │ • Theme system      │               │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ 🤖 Nomura                                     Overall: ████████ 92%│   │
│ │ Agent • 5 items active                                             │   │
│ ├────────────────────────────────────────────────────────────────────┤   │
│ │ 🚧 In Progress (4)           │ 📝 Committed (1)    │ 👀 Review (0) │   │
│ │ • Responsive CSS ████░░░░    │ • PWA offline       │               │   │
│ │ • Theme system ██████░░░░    │                     │               │   │
│ │ • Voice creation ██░░░░░░░   │                     │               │   │
│ │ • Mobile deploy ████████░░   │                     │               │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Timeline View

Gantt-style time-based visualization:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📅 Timeline View          Feb 2026                    [◀ Week ▶]        │
├──────────────────────────────────────────────────────────────────────────┤
│              │ Mon 3 │ Tue 4 │ Wed 5 │ Thu 6 │ Fri 7 │ Sat 8 │ Sun 9 │  │
│ ─────────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤  │
│ User login   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░│  │
│ @İrtek       │ Started ──────────────────────────────────── Due      │  │
│              │                                                        │  │
│ Dashboard    │              │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  │
│ @Nomura      │              │ Feb 5 ────────────────────── Feb 12   │  │
│              │                                                        │  │
│ Voice input  │                      │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │
│ unassigned   │                      │ Scheduled ───── No due date │  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Network View

Graph visualization of connections:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🔗 Network View                     [Zoom: ─●───]  [Filter: All Types]  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        ┌─────────────┐                                   │
│                   ┌───→│ 📄 API Docs │                                   │
│                   │    └─────────────┘                                   │
│    ┌──────────────┴──┐        │                                          │
│    │ 💭 API Ideas    │        │ references                               │
│    │   (ideation)    │        ▼                                          │
│    └────────┬────────┘  ┌───────────────┐                                │
│             │           │ ✓ User Login  │←────┐                          │
│             │ spawned   │  (in_progress)│     │ assigned                 │
│             ▼           └───────────────┘     │                          │
│    ┌──────────────────┐        │         ┌────┴─────┐                    │
│    │ ✓ API Refactor   │        │ blocks  │ 👤 İrtek │                    │
│    │   (in_progress)  │        ▼         └──────────┘                    │
│    └──────────────────┘  ┌───────────────┐                               │
│                          │ ✓ Dashboard   │                               │
│                          │  (committed)  │                               │
│                          └───────────────┘                               │
│                                                                          │
│ Legend: ───→ spawned │ ─ ─→ references │ ━━━→ blocks │ ···→ assigned     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.6 Focus View

Today's priorities with context:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🎯 Focus View                                Today: Friday, Feb 7, 2026 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⏰ DUE TODAY                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 🔴 User Login System                              Due: Today 5pm   │  │
│  │    ████████░░ 80% complete • 2 subtasks remaining                  │  │
│  │    Context: Spawned from API Ideas, blocks Dashboard               │  │
│  │    [▶ Continue]  [📝 Notes]  [⏰ Extend]                           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  🔥 HIGH PRIORITY                                                        │
│  ┌──────────────────────────────────┐ ┌────────────────────────────────┐│
│  │ Responsive CSS                   │ │ Theme System                   ││
│  │ @CSS-Architect • ████░░ 40%      │ │ @Nomura • ██░░░░ 20%           ││
│  │ No due date                      │ │ Due: Feb 10                    ││
│  └──────────────────────────────────┘ └────────────────────────────────┘│
│                                                                          │
│  👀 AWAITING YOUR REVIEW                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Chat Widget Integration          Completed by: Nomura               │  │
│  │ Ready for review since: 2 hours ago                                 │  │
│  │ [✓ Approve & Deliver]  [↩ Request Changes]  [💬 Comment]           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  💭 QUICK CAPTURE                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ [Type a quick idea... it goes to Ideation]                    [+]  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Feature Prioritization

### Phase 1: Foundation (Week 1-2)
**Goal:** Unified data model, basic flow states

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Unified WorkItem schema | M | Critical |
| 2 | Data migration (tasks → work items) | M | Critical |
| 3 | Flow states replace status columns | M | High |
| 4 | Basic Flow View (swim lanes) | L | High |
| 5 | View switcher UI | S | Medium |

### Phase 2: Connections (Week 3-4)
**Goal:** Link items together, show relationships

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 6 | Connection data model | S | Critical |
| 7 | "Spawned from" tracking (Idea→Task) | M | High |
| 8 | One-click convert (Idea→Task) | S | High |
| 9 | Reference links in content | M | Medium |
| 10 | Connection badges on cards | S | Medium |

### Phase 3: People (Week 5-6)
**Goal:** Work organized by person

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 11 | Enhanced Person model | S | High |
| 12 | People View implementation | M | High |
| 13 | Workload rollup calculations | M | Medium |
| 14 | Assignment from any view | S | Medium |

### Phase 4: Advanced Views (Week 7-8)
**Goal:** Timeline and Network views

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 15 | Timeline View (simple Gantt) | L | Medium |
| 16 | Focus View (today's priorities) | M | High |
| 17 | Network View (graph) | L | Low |

### Phase 5: Polish (Week 9-10)
**Goal:** Auto-linking, notifications

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 18 | Auto-link on content parsing | M | Medium |
| 19 | State change notifications | M | Medium |
| 20 | Keyboard shortcuts | S | Medium |
| 21 | Mobile-optimized views | M | High |

---

## Part 5: Technical Approach

### 5.1 Constraints

- ✅ Single-file architecture (index.html)
- ✅ Local JSON storage (data/tasks.json → data/flow.json)
- ✅ Python server compatibility
- ✅ Progressive enhancement (existing features work)

### 5.2 Data Migration Strategy

```javascript
// Migration function: tasks.json → flow.json
function migrateToFlow(oldData) {
  const workItems = oldData.tasks.map(task => ({
    id: task.id.replace('task_', 'work_'),
    type: inferType(task),  // 'task' | 'idea' | 'doc'
    title: task.title,
    content: task.description,
    flowState: mapStatusToFlow(task.status),
    flowHistory: [{ 
      state: mapStatusToFlow(task.status), 
      at: task.createdAt,
      by: 'migration' 
    }],
    connections: { spawned_from: null, spawns: [], references: [], blocks: [], blocked_by: [] },
    owner: null,
    assignees: [],
    project: task.project,
    tags: task.tags,
    priority: task.priority,
    subtasks: task.subtasks,
    comments: task.comments || [],
    createdAt: task.createdAt,
    dueAt: null,
    lastActivityAt: task.createdAt
  }));
  
  // Also migrate todos as work items
  const todoItems = (oldData.todos || []).map(todo => ({
    id: todo.id.replace('todo_', 'work_'),
    type: 'idea',
    title: todo.title,
    content: '',
    flowState: todo.done ? 'delivered' : 'ideation',
    // ... rest of fields
  }));
  
  return {
    workItems: [...workItems, ...todoItems],
    people: extractPeopleFromTasks(workItems),
    projects: oldData.projects,
    version: 2,
    migratedAt: new Date().toISOString()
  };
}

function mapStatusToFlow(status) {
  const mapping = {
    'permanent': 'committed',
    'scheduled': 'committed', 
    'backlog': 'ideation',
    'in_progress': 'in_progress',
    'review': 'review',
    'done': 'delivered'
  };
  return mapping[status] || 'ideation';
}
```

### 5.3 View Rendering Architecture

```javascript
// View renderer pattern
const ViewRenderers = {
  flow: {
    render(workItems, filters) {
      // Group by flowState
      const byState = groupBy(workItems, 'flowState');
      return renderSwimLanes(byState);
    }
  },
  
  people: {
    render(workItems, people, filters) {
      // Group by assignee
      const byPerson = groupBy(workItems, item => item.assignees[0] || 'unassigned');
      return renderPersonCards(byPerson, people);
    }
  },
  
  timeline: {
    render(workItems, filters) {
      // Filter items with dates, render Gantt
      const withDates = workItems.filter(i => i.dueAt || i.createdAt);
      return renderGantt(withDates);
    }
  },
  
  focus: {
    render(workItems, filters) {
      const today = new Date().toDateString();
      const dueToday = workItems.filter(i => new Date(i.dueAt).toDateString() === today);
      const highPriority = workItems.filter(i => i.priority === 'high' && i.flowState === 'in_progress');
      const inReview = workItems.filter(i => i.flowState === 'review');
      return renderFocusView({ dueToday, highPriority, inReview });
    }
  },
  
  network: {
    render(workItems, filters) {
      // Build graph data, render with canvas or SVG
      const nodes = workItems.map(toNode);
      const edges = extractConnections(workItems);
      return renderGraph(nodes, edges);
    }
  }
};
```

### 5.4 Connection Engine

```javascript
// Auto-linking on content change
function parseConnections(content, currentItemId) {
  const connections = { references: [], mentions: [] };
  
  // [[work_xxx]] pattern
  const linkPattern = /\[\[(work_\w+)\]\]/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    connections.references.push(match[1]);
  }
  
  // @person pattern
  const mentionPattern = /@(\w+)/g;
  while ((match = mentionPattern.exec(content)) !== null) {
    connections.mentions.push(match[1]);
  }
  
  return connections;
}

// Bidirectional link maintenance
function createLink(fromId, toId, type) {
  const fromItem = getWorkItem(fromId);
  const toItem = getWorkItem(toId);
  
  if (!fromItem.connections[type].includes(toId)) {
    fromItem.connections[type].push(toId);
  }
  
  // Reverse link
  const reverseType = getReverseType(type);
  if (reverseType && !toItem.connections[reverseType].includes(fromId)) {
    toItem.connections[reverseType].push(fromId);
  }
}
```

### 5.5 State Machine

```javascript
// Flow state transitions with hooks
const FlowMachine = {
  states: ['ideation', 'exploration', 'committed', 'in_progress', 'review', 'delivered'],
  
  canTransition(from, to) {
    const rules = {
      ideation: ['exploration', 'committed'],
      exploration: ['ideation', 'committed'],
      committed: ['exploration', 'ideation', 'in_progress'],
      in_progress: ['committed', 'review', 'delivered'],
      review: ['in_progress', 'delivered'],
      delivered: ['review']  // Can reopen
    };
    return rules[from]?.includes(to) ?? false;
  },
  
  transition(item, newState, actor = 'user') {
    if (!this.canTransition(item.flowState, newState)) {
      throw new Error(`Invalid transition: ${item.flowState} → ${newState}`);
    }
    
    item.flowHistory.push({
      state: newState,
      from: item.flowState,
      at: new Date().toISOString(),
      by: actor
    });
    item.flowState = newState;
    item.lastActivityAt = new Date().toISOString();
    
    // Trigger hooks
    this.onTransition(item, newState);
  },
  
  onTransition(item, newState) {
    // Webhook notification (existing behavior)
    if (newState === 'in_progress') {
      notifyWebhook(item, 'started');
    } else if (newState === 'review') {
      notifyWebhook(item, 'ready_for_review');
    } else if (newState === 'delivered') {
      notifyWebhook(item, 'completed');
    }
  }
};
```

### 5.6 File Structure

```
data/
├── tasks.json          # LEGACY (keep for fallback)
├── flow.json           # NEW unified data
└── flow-backup-*.json  # Auto-backups before migrations
```

---

## Part 6: Mock Screen Descriptions

### Mock 1: Flow View with Connections

**Scene:** User opens Mission Control. Flow View is active (default).

The screen shows 6 swim lane columns: 💡 Ideation (4), 🔬 Exploration (2), 📝 Committed (5), 🚧 In Progress (3), 👀 Review (1), ✅ Delivered (collapsed, showing "12 items").

Each card shows:
- Type icon (📄 doc, 💭 idea, ✓ task, 📦 deliverable)
- Title
- Assignee avatar (small circle) if assigned
- Progress bar if has subtasks
- Connection badge (🔗 2) if linked to other items
- Due date badge if set

**Interaction:** User drags "API Ideas" doc from Ideation to Exploration. A toast appears: "Moved to Exploration. Ready to commit? [→ Make Task]"

### Mock 2: One-Click Convert

**Scene:** User clicks "→ Make Task" button on an Ideation doc.

Modal appears:
```
╔════════════════════════════════════════════════════════════╗
║  Convert to Task                                           ║
╠════════════════════════════════════════════════════════════╣
║  📄 Original: "API Architecture Ideas"                     ║
║                                                            ║
║  New Task Title: [API Architecture Implementation    ]     ║
║                                                            ║
║  Assignee: [👤 İrtek ▾]                                    ║
║  Due Date: [Feb 15, 2026      📅]                         ║
║  Priority: [🟡 Medium ▾]                                   ║
║                                                            ║
║  ☑ Link back to original doc                              ║
║  ☑ Copy content as description                            ║
║                                                            ║
║           [Cancel]  [Create Task →]                        ║
╚════════════════════════════════════════════════════════════╝
```

Result: New task created in "Committed" state, with `spawned_from: work_api_ideas` connection. Original doc shows "Spawned → API Architecture Implementation" badge.

### Mock 3: Person View Drill-Down

**Scene:** User clicks on İrtek's name in People View.

The view expands to show:
- Header: Avatar, name, role, overall completion %
- Three columns: In Progress | Committed | Review
- Each item shows mini progress bar and due date
- Workload meter: "8 items active (🟡 moderate load)"
- Recent activity: "Moved 'User Login' to Review 2h ago"

**Interaction:** User can drag items within this view to change state. Clicking item opens detail modal.

### Mock 4: Focus View Morning

**Scene:** User opens Mission Control in morning. Focus View active.

```
Good morning, İrtek! Here's your focus for Friday, Feb 7.

⏰ DUE TODAY (1)
┌────────────────────────────────────────────────────────────┐
│ 🔴 User Login System                         Due: 5pm     │
│    ████████░░ 80% • Finish OAuth integration              │
│    💡 Spawned from: API Ideas                             │
│    [▶ Continue Working]                                    │
└────────────────────────────────────────────────────────────┘

👀 NEEDS YOUR REVIEW (2)
• Chat Widget — @Nomura finished 2h ago [Review]
• PWA Setup — @MobileEng finished yesterday [Review]

📝 RECENTLY COMMITTED (not started)
• Dashboard redesign • Mobile app • Voice input

💭 QUICK CAPTURE
[What's on your mind? Press Enter to add to Ideation...]
```

### Mock 5: Network View Connection Map

**Scene:** User switches to Network View to understand project connections.

Canvas shows:
- Nodes as rounded rectangles, colored by flowState
- Idea nodes are light gray, In Progress are blue, Delivered are green
- Lines connect related items:
  - Solid arrows for "spawned" relationships
  - Dashed lines for "references"
  - Thick lines for "blocks"
- Person nodes (circles) connect to their assigned items

Hovering a node highlights all its connections. Clicking opens detail panel on right side.

Filter bar: "Show: [All] [Ideas only] [Tasks only] [Blocking chains only]"

---

## Implementation Notes

### Backward Compatibility

1. **Keep tasks.json working:** First load checks for `flow.json`. If missing, reads `tasks.json` and renders in legacy mode.

2. **Migration banner:** When old data detected, show:
   ```
   ╔══════════════════════════════════════════════════════════════╗
   ║ 🚀 Upgrade to Intelligent Flow?                              ║
   ║ New features: Connected items, Flow states, People view      ║
   ║                           [Upgrade Now]  [Maybe Later]       ║
   ╚══════════════════════════════════════════════════════════════╝
   ```

3. **Legacy view:** Add "📋 Classic Kanban" as a view option for users who prefer the old layout.

### Performance Considerations

1. **Lazy render:** Only render visible cards in each column
2. **Virtual scrolling:** For columns with 50+ items
3. **Debounced search:** 300ms delay on filter input
4. **Connection cache:** Pre-compute connection counts on data load

### Mobile Adaptations

1. **Flow View:** Horizontal scroll with snap-to-column
2. **People View:** Stacked cards, collapsible sections
3. **Focus View:** Primary mobile view (ideal for morning check-in)
4. **Network View:** Simplified list view on small screens

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Views available | 4 tabs | 6 views |
| Item connections | 0 | avg 2.5 per item |
| Time to create task from idea | N/A (manual) | < 5 seconds |
| Time to understand workload | Browse all tabs | Instant (People view) |
| Items with owners | 0% | > 80% |

---

## Appendix: CSS Variables for Flow States

```css
:root {
  /* Flow State Colors */
  --flow-ideation: #9ca3af;      /* gray-400 */
  --flow-exploration: #a78bfa;   /* violet-400 */
  --flow-committed: #60a5fa;     /* blue-400 */
  --flow-in-progress: #fbbf24;   /* amber-400 */
  --flow-review: #f97316;        /* orange-500 */
  --flow-delivered: #34d399;     /* emerald-400 */
  
  /* Flow State Backgrounds (10% opacity) */
  --flow-ideation-bg: rgba(156, 163, 175, 0.1);
  --flow-exploration-bg: rgba(167, 139, 250, 0.1);
  --flow-committed-bg: rgba(96, 165, 250, 0.1);
  --flow-in-progress-bg: rgba(251, 191, 36, 0.1);
  --flow-review-bg: rgba(249, 115, 22, 0.1);
  --flow-delivered-bg: rgba(52, 211, 153, 0.1);
}
```

---

## Next Steps

1. **Review this design** with stakeholders (İrtek)
2. **Prototype Phase 1** — Unified data model + basic Flow View
3. **User testing** — Does flow metaphor resonate?
4. **Iterate** — Adjust based on feedback

---

*This design document represents the north star for Mission Control evolution. Implementation will be incremental, always maintaining backward compatibility.*
