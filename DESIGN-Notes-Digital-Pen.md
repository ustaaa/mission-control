# Notes with Digital Pen Input - Design Document

**Version:** 1.0  
**Date:** 2026-02-07  
**Feature:** Handwritten notes with stylus/digital pen support

---

## Overview

Add a Notes section to Mission Control that supports digital pen/stylus input for tablets (iPad + Apple Pencil, Surface Pro, Android tablets with stylus). Users can create handwritten notes, sketches, and diagrams directly in the browser.

---

## 1. UI Design

### 1.1 Navigation Integration

Add "📝 Notes" tab to existing nav structure:

```html
<div class="nav-tabs">
    <div class="nav-tab" data-view="tasks">📋 Tasks</div>
    <div class="nav-tab" data-view="todo">☑️ Todo</div>
    <div class="nav-tab" data-view="docs">📄 Docs</div>
    <div class="nav-tab" data-view="notes">📝 Notes</div>  <!-- NEW -->
    <div class="nav-tab" data-view="people">👥 People</div>
</div>
```

### 1.2 Notes List View

Grid layout showing note thumbnails (similar to Apple Notes/OneNote):

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 Notes                                    [+ New Note] [⋮]  │
├─────────────────────────────────────────────────────────────────┤
│  [Grid/List Toggle]  [Sort: Recent ▼]  [Search notes...]       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ ~~~~~~~~ │  │ ~~~~~~~~ │  │ ~~~~~~~~ │  │ ~~~~~~~~ │        │
│  │ ~~~~~~~~ │  │  [sketch]│  │ ~~~~~~~~ │  │ ~~~~~~~~ │        │
│  │ ~~~~~~~~ │  │ ~~~~~~~~ │  │ ~~~~~~~~ │  │ ~~~~~~~~ │        │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤        │
│  │ Meeting  │  │ Diagram  │  │ Ideas    │  │ Quick... │        │
│  │ 2h ago   │  │ Yesterday│  │ Feb 5    │  │ Feb 3    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                 │
│  ┌──────────┐  ┌──────────┐                                    │
│  │ ~~~~~~~~ │  │   [+]    │                                    │
│  │ ~~~~~~~~ │  │  New     │                                    │
│  │ ~~~~~~~~ │  │  Note    │                                    │
│  ├──────────┤  └──────────┘                                    │
│  │ Sketch   │                                                  │
│  │ Jan 30   │                                                  │
│  └──────────┘                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Note Card Components:**
- Thumbnail preview (160×120px canvas snapshot)
- Title (editable, auto-generated from first stroke or "Untitled")
- Last modified timestamp
- Optional: color tag/folder indicator

### 1.3 Drawing Canvas View

Full-screen canvas when opening a note:

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back   "Meeting Notes"   ✏️ 🖍️ 🧽 ⬜  |  ↩️ ↪️  |  ⬇️ 🗑️   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│                    ╭──────────────────╮                         │
│                    │                  │                         │
│                    │   Canvas Area    │                         │
│                    │   (full screen)  │                         │
│                    │                  │                         │
│                    │   ~~~~~~~~       │                         │
│                    │   ~~~~~~~~       │                         │
│                    │                  │                         │
│                    ╰──────────────────╯                         │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Toolbar (collapsible on tablets):**
| Icon | Tool | Description |
|------|------|-------------|
| ✏️ | Pen | Variable width (pressure), solid stroke |
| 🖍️ | Highlighter | Semi-transparent, fixed wider stroke |
| 🧽 | Eraser | Stroke-based eraser (removes full strokes) |
| ⬜ | Select | Lasso selection for move/copy/delete |
| ↩️ | Undo | Undo last stroke |
| ↪️ | Redo | Redo undone stroke |
| ⬇️ | Export | Save as PNG/PDF |
| 🗑️ | Clear/Delete | Clear page or delete note |

**Color Palette (expandable):**
```
[●] Black  [●] Red  [●] Blue  [●] Green  [●] Yellow  [●] Purple  [+]
```

**Stroke Width (for non-pressure input):**
```
[·] [•] [●] [⬤]  (1px, 2px, 4px, 8px)
```

**Page Background Options:**
```
[□ Blank] [≡ Lined] [# Grid] [◐ Dark]
```

---

## 2. Technical Implementation

### 2.1 Core Technologies

| Technology | Purpose |
|------------|---------|
| HTML5 Canvas API | Drawing surface |
| Pointer Events API | Unified mouse/touch/pen input |
| `event.pressure` | Pressure sensitivity (0.0-1.0) |
| `event.pointerType` | Distinguish pen vs touch vs mouse |
| localStorage | Note storage (JSON) |
| Canvas.toDataURL() | Thumbnail generation |

### 2.2 Pointer Events for Stylus Input

```javascript
// Canvas setup with pointer events
class DrawingCanvas {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.isDrawing = false;
        this.currentStroke = null;
        this.strokes = [];
        this.undoStack = [];
        this.activePenId = null; // For palm rejection
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Pointer events for unified input
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this));
        
        // Prevent default touch actions (scrolling, zooming) while drawing
        this.canvas.style.touchAction = 'none';
        
        // Prevent context menu on long-press
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    handlePointerDown(e) {
        // Palm rejection: if a pen is active, ignore touch input
        if (this.activePenId !== null && e.pointerType !== 'pen') {
            return; // Ignore touch while pen is active
        }
        
        // Capture pen input
        if (e.pointerType === 'pen') {
            this.activePenId = e.pointerId;
        }
        
        // Capture pointer for this element
        this.canvas.setPointerCapture(e.pointerId);
        
        this.isDrawing = true;
        const point = this.getPoint(e);
        
        this.currentStroke = {
            points: [point],
            color: this.currentColor,
            width: this.currentWidth,
            tool: this.currentTool,
            timestamp: Date.now()
        };
    }
    
    handlePointerMove(e) {
        if (!this.isDrawing) return;
        
        // Palm rejection check
        if (this.activePenId !== null && e.pointerId !== this.activePenId) {
            return;
        }
        
        const point = this.getPoint(e);
        this.currentStroke.points.push(point);
        
        // Draw the current segment
        this.drawSegment(
            this.currentStroke.points[this.currentStroke.points.length - 2],
            point,
            this.currentStroke
        );
    }
    
    handlePointerUp(e) {
        if (!this.isDrawing) return;
        
        // Release pen tracking
        if (e.pointerType === 'pen' && e.pointerId === this.activePenId) {
            this.activePenId = null;
        }
        
        this.isDrawing = false;
        
        if (this.currentStroke && this.currentStroke.points.length > 0) {
            // Save stroke
            this.strokes.push(this.currentStroke);
            this.undoStack = []; // Clear redo stack
            
            // Trigger auto-save
            this.onStrokeComplete();
        }
        
        this.currentStroke = null;
    }
    
    getPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
            pressure: e.pressure || 0.5, // Default pressure for mouse
            tiltX: e.tiltX || 0,
            tiltY: e.tiltY || 0
        };
    }
    
    drawSegment(p1, p2, stroke) {
        const ctx = this.ctx;
        
        // Calculate width based on pressure
        const basePressure = (p1.pressure + p2.pressure) / 2;
        const width = stroke.tool === 'highlighter' 
            ? stroke.width * 3 
            : stroke.width * (0.5 + basePressure * 1.5);
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (stroke.tool === 'highlighter') {
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = stroke.color;
        } else {
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = stroke.color;
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}
```

### 2.3 Palm Rejection Logic

```javascript
// Enhanced palm rejection with temporal filtering
class PalmRejection {
    constructor() {
        this.activePointers = new Map();
        this.penActive = false;
        this.penLastSeen = 0;
        this.PALM_TIMEOUT_MS = 300; // Ignore touch 300ms after pen lifts
    }
    
    shouldAcceptInput(e) {
        const now = Date.now();
        
        if (e.pointerType === 'pen') {
            this.penActive = true;
            this.penLastSeen = now;
            return true;
        }
        
        if (e.pointerType === 'touch') {
            // Reject touch if pen is active or was recently used
            if (this.penActive) return false;
            if (now - this.penLastSeen < this.PALM_TIMEOUT_MS) return false;
        }
        
        return true; // Accept mouse always
    }
    
    penLifted() {
        this.penActive = false;
    }
}
```

### 2.4 Smooth Line Drawing (Catmull-Rom Splines)

For smoother strokes, interpolate between points:

```javascript
drawSmoothStroke(stroke) {
    const points = stroke.points;
    if (points.length < 2) return;
    
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    // Catmull-Rom to Bezier conversion
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, points.length - 1)];
        
        // Control points
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    
    ctx.stroke();
}
```

### 2.5 Eraser Implementation

**Stroke-based eraser** (recommended - more intuitive, smaller storage):

```javascript
eraseAtPoint(x, y, radius = 20) {
    // Find strokes that intersect with eraser circle
    this.strokes = this.strokes.filter(stroke => {
        // Check if any point in stroke is within eraser radius
        const intersects = stroke.points.some(p => {
            const dx = p.x - x;
            const dy = p.y - y;
            return Math.sqrt(dx*dx + dy*dy) < radius;
        });
        return !intersects; // Keep strokes that DON'T intersect
    });
    
    this.redrawCanvas();
}
```

### 2.6 Undo/Redo System

```javascript
class UndoManager {
    constructor(maxStates = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxStates = maxStates;
    }
    
    pushState(strokes) {
        // Clone strokes array
        this.undoStack.push(JSON.parse(JSON.stringify(strokes)));
        this.redoStack = []; // Clear redo on new action
        
        // Limit stack size
        if (this.undoStack.length > this.maxStates) {
            this.undoStack.shift();
        }
    }
    
    undo(currentStrokes) {
        if (this.undoStack.length === 0) return currentStrokes;
        
        this.redoStack.push(JSON.parse(JSON.stringify(currentStrokes)));
        return this.undoStack.pop();
    }
    
    redo(currentStrokes) {
        if (this.redoStack.length === 0) return currentStrokes;
        
        this.undoStack.push(JSON.parse(JSON.stringify(currentStrokes)));
        return this.redoStack.pop();
    }
}
```

---

## 3. Data Model

### 3.1 Note Object Structure

```typescript
interface Note {
    id: string;           // UUID
    title: string;        // User-editable title
    createdAt: number;    // Unix timestamp
    updatedAt: number;    // Unix timestamp
    
    // Canvas configuration
    width: number;        // Canvas width (default 2048)
    height: number;       // Canvas height (default 2048)
    background: 'blank' | 'lined' | 'grid' | 'dark';
    
    // Stroke data (primary storage)
    strokes: Stroke[];
    
    // Thumbnail (for list view)
    thumbnail: string;    // base64 data URL (160×120 JPEG)
    
    // Metadata
    tags?: string[];
    folderId?: string;
    archived?: boolean;
}

interface Stroke {
    id: string;           // UUID for individual stroke (for selection)
    tool: 'pen' | 'highlighter';
    color: string;        // Hex color (#000000)
    width: number;        // Base stroke width (1-20)
    points: StrokePoint[];
    timestamp: number;
}

interface StrokePoint {
    x: number;            // Canvas X coordinate
    y: number;            // Canvas Y coordinate
    p: number;            // Pressure (0.0-1.0), shortened for storage
}
```

### 3.2 Optimized Storage Format

For efficiency, store points as typed arrays:

```javascript
// Compact stroke format for localStorage
const compactStroke = {
    t: 'p',                    // tool: 'p' = pen, 'h' = highlighter
    c: '#000',                 // color
    w: 2,                      // width
    d: 'M10,20P0.5L30,40P0.8'  // SVG-like path with pressure
};

// Serialize strokes for storage
function serializeStrokes(strokes) {
    return strokes.map(s => ({
        t: s.tool === 'pen' ? 'p' : 'h',
        c: s.color,
        w: s.width,
        // Pack points as: x,y,p;x,y,p;...
        d: s.points.map(pt => 
            `${Math.round(pt.x)},${Math.round(pt.y)},${pt.p.toFixed(2)}`
        ).join(';')
    }));
}

// Deserialize strokes from storage
function deserializeStrokes(data) {
    return data.map(s => ({
        tool: s.t === 'p' ? 'pen' : 'highlighter',
        color: s.c,
        width: s.w,
        points: s.d.split(';').map(pt => {
            const [x, y, p] = pt.split(',').map(Number);
            return { x, y, p };
        })
    }));
}
```

### 3.3 Storage Keys

```javascript
// localStorage keys
const STORAGE_KEYS = {
    NOTES_INDEX: 'mc_notes_index',     // Array of note IDs
    NOTE_PREFIX: 'mc_note_',            // Individual note: mc_note_{id}
    NOTES_SETTINGS: 'mc_notes_settings' // User preferences
};

// Example: Load note
function loadNote(id) {
    const data = localStorage.getItem(`mc_note_${id}`);
    return data ? JSON.parse(data) : null;
}

// Example: Save note
function saveNote(note) {
    note.updatedAt = Date.now();
    note.thumbnail = generateThumbnail(note);
    localStorage.setItem(`mc_note_${note.id}`, JSON.stringify(note));
    updateNotesIndex(note.id);
}
```

### 3.4 Storage Size Estimation

| Component | Size per Note |
|-----------|---------------|
| Metadata | ~200 bytes |
| Thumbnail (160×120 JPEG) | ~5-10 KB |
| Strokes (typical 1-page note) | ~20-50 KB |
| **Total typical note** | **~30-60 KB** |

localStorage limit: 5-10 MB → **80-160 notes** capacity

**Future: IndexedDB** for larger storage (recommended for MVP+1)

---

## 4. Tablet Optimization

### 4.1 Full-Screen Mode

```javascript
// Enter immersive drawing mode
function enterFullscreenDrawing() {
    const canvasContainer = document.getElementById('notes-canvas-container');
    
    if (canvasContainer.requestFullscreen) {
        canvasContainer.requestFullscreen();
    } else if (canvasContainer.webkitRequestFullscreen) {
        canvasContainer.webkitRequestFullscreen(); // iOS Safari
    }
    
    // Hide navigation and other chrome
    document.body.classList.add('drawing-mode');
}

// CSS for drawing mode
.drawing-mode .header,
.drawing-mode .nav-tabs,
.drawing-mode .stats-bar {
    display: none;
}

.drawing-mode .notes-canvas-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
}
```

### 4.2 Responsive Toolbar

```css
/* Default: horizontal toolbar at top */
.drawing-toolbar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
}

/* Tablet portrait: floating side toolbar */
@media (max-width: 768px) and (orientation: portrait) {
    .drawing-toolbar {
        position: fixed;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        flex-direction: column;
        border-radius: 12px;
        border: 1px solid var(--border);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 100;
    }
}

/* Collapsed toolbar (double-tap to toggle) */
.drawing-toolbar.collapsed {
    padding: 0.5rem;
}

.drawing-toolbar.collapsed .tool-btn:not(.active) {
    display: none;
}

.drawing-toolbar.collapsed .toolbar-expand {
    display: block;
}
```

### 4.3 Gesture Handling

```javascript
// Double-tap to toggle toolbar
let lastTap = 0;
canvas.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
        toggleToolbar();
    }
    lastTap = now;
});

// Two-finger pan (with touch-action: none, handle manually)
let lastTouchDistance = null;
let lastTouchCenter = null;

canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        // Calculate pinch zoom
        const distance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        if (lastTouchDistance !== null) {
            const scale = distance / lastTouchDistance;
            applyZoom(scale);
        }
        
        // Calculate pan
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        
        if (lastTouchCenter !== null) {
            const dx = centerX - lastTouchCenter.x;
            const dy = centerY - lastTouchCenter.y;
            applyPan(dx, dy);
        }
        
        lastTouchDistance = distance;
        lastTouchCenter = { x: centerX, y: centerY };
    }
}, { passive: false });
```

### 4.4 Apple Pencil Specifics

```javascript
// Detect Apple Pencil features
canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'pen') {
        // Apple Pencil provides:
        // - e.pressure (0.0 - 1.0)
        // - e.tiltX, e.tiltY (-90 to 90 degrees)
        // - e.twist (0 to 359 degrees) - not on Apple Pencil
        
        // Use tilt for shading effect (optional advanced feature)
        const tiltMagnitude = Math.sqrt(e.tiltX**2 + e.tiltY**2);
        if (tiltMagnitude > 45) {
            // Pencil is tilted - could switch to shading mode
        }
    }
});

// Request low-latency input on supported browsers
if ('getCoalescedEvents' in PointerEvent.prototype) {
    canvas.addEventListener('pointermove', (e) => {
        // Get all coalesced events for smoother drawing
        const events = e.getCoalescedEvents();
        for (const coalesced of events) {
            handlePointerMove(coalesced);
        }
    });
}
```

### 4.5 PWA Optimization for iPad

Add to existing `manifest.json`:

```json
{
    "display": "standalone",
    "orientation": "any",
    "categories": ["productivity", "utilities"]
}
```

Additional meta tags for iOS:

```html
<!-- Allow landscape on iPad -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

<!-- Prevent overscroll bounce while drawing -->
<style>
    html, body {
        overscroll-behavior: none;
    }
    
    .notes-canvas-container {
        touch-action: none;
        -webkit-overflow-scrolling: auto;
    }
</style>
```

---

## 5. CSS Styles (Theme-Compatible)

```css
/* ============================================
   NOTES SECTION STYLES
   ============================================ */

/* Notes List View */
.notes-container {
    padding: var(--space-lg);
    height: calc(100vh - 180px);
    overflow-y: auto;
}

.notes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
}

.notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-md);
}

.note-card {
    background: var(--bg-card);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s;
}

.note-card:hover {
    border-color: var(--border);
    transform: translateY(-2px);
}

.note-card.selected {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 2px rgba(69, 133, 136, 0.3);
}

.note-thumbnail {
    width: 100%;
    height: 120px;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
}

.note-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.note-thumbnail.empty::after {
    content: '📝';
    font-size: 2rem;
    opacity: 0.3;
}

.note-info {
    padding: 0.75rem;
}

.note-title {
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.note-date {
    font-size: 0.75rem;
    color: var(--text-secondary);
}

/* New Note Card */
.note-card.new-note {
    border: 2px dashed var(--border);
    background: transparent;
}

.note-card.new-note:hover {
    border-color: var(--accent-blue);
    background: rgba(69, 133, 136, 0.1);
}

.note-card.new-note .note-thumbnail {
    background: transparent;
}

.note-card.new-note .note-thumbnail::after {
    content: '+';
    font-size: 3rem;
    color: var(--text-secondary);
}

/* ============================================
   DRAWING CANVAS STYLES
   ============================================ */

.notes-canvas-view {
    display: none;
    flex-direction: column;
    height: 100vh;
    background: var(--bg-primary);
}

.notes-canvas-view.active {
    display: flex;
}

/* Canvas Toolbar */
.drawing-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
}

.toolbar-group {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0 0.5rem;
    border-right: 1px solid var(--border);
}

.toolbar-group:last-child {
    border-right: none;
}

.tool-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1.1rem;
    transition: all 0.15s;
}

.tool-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
}

.tool-btn.active {
    background: var(--accent-blue);
    color: white;
}

/* Color Picker */
.color-picker {
    display: flex;
    gap: 4px;
}

.color-swatch {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.15s;
}

.color-swatch:hover {
    transform: scale(1.15);
}

.color-swatch.active {
    border-color: var(--text-primary);
    box-shadow: 0 0 0 2px var(--bg-secondary);
}

/* Width Selector */
.width-selector {
    display: flex;
    align-items: center;
    gap: 4px;
}

.width-option {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: var(--bg-card);
    cursor: pointer;
}

.width-option.active {
    border-color: var(--accent-blue);
    background: rgba(69, 133, 136, 0.2);
}

.width-dot {
    border-radius: 50%;
    background: var(--text-primary);
}

/* Canvas Area */
.canvas-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: var(--bg-primary);
}

.drawing-canvas {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    cursor: crosshair;
}

/* Background Options */
.drawing-canvas.bg-lined {
    background-image: repeating-linear-gradient(
        transparent,
        transparent 31px,
        #e0e0e0 31px,
        #e0e0e0 32px
    );
    background-color: white;
}

.drawing-canvas.bg-grid {
    background-image: 
        linear-gradient(#e0e0e0 1px, transparent 1px),
        linear-gradient(90deg, #e0e0e0 1px, transparent 1px);
    background-size: 32px 32px;
    background-color: white;
}

.drawing-canvas.bg-dark {
    background: #1a1a1a;
}

/* Zoom Controls */
.zoom-controls {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 0.25rem;
    border: 1px solid var(--border);
}

.zoom-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1rem;
    border-radius: 4px;
}

.zoom-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
}

.zoom-level {
    text-align: center;
    font-size: 0.7rem;
    color: var(--text-secondary);
    padding: 0.25rem;
}
```

---

## 6. Implementation Phases

### Phase 1: MVP (Week 1)
**Goal:** Basic working notes with pen input

- [ ] Notes list view (grid with thumbnails)
- [ ] Create/open/delete notes
- [ ] Canvas with pen tool (pressure-sensitive)
- [ ] Basic palm rejection
- [ ] Single color (black)
- [ ] Undo/Redo
- [ ] localStorage persistence
- [ ] Auto-generated thumbnails

### Phase 2: Core Features (Week 2)
**Goal:** Full drawing toolkit

- [ ] Highlighter tool
- [ ] Stroke-based eraser
- [ ] Color palette (8 colors)
- [ ] Stroke width options
- [ ] Page backgrounds (blank, lined, grid, dark)
- [ ] Export as PNG
- [ ] Note title editing
- [ ] Search notes by title

### Phase 3: Tablet Polish (Week 3)
**Goal:** Optimized tablet experience

- [ ] Full-screen drawing mode
- [ ] Collapsible/floating toolbar
- [ ] Double-tap to toggle toolbar
- [ ] Two-finger pan & pinch zoom
- [ ] Better palm rejection timing
- [ ] PWA manifest updates
- [ ] Portrait/landscape handling

### Phase 4: Advanced (Future)
**Goal:** Power user features

- [ ] Lasso selection tool (move/copy/delete strokes)
- [ ] Infinite canvas with pan
- [ ] Multiple pages per note
- [ ] Folders/organization
- [ ] Export as PDF
- [ ] Audio recording sync
- [ ] IndexedDB for larger storage
- [ ] Cloud sync (optional)
- [ ] Handwriting-to-text (OCR)

---

## 7. File Structure (Single-File App)

All code integrates into existing `index.html`:

```html
<!-- In <head> or <style> section -->
<style>
    /* Add Notes CSS from Section 5 */
</style>

<!-- In nav-tabs -->
<div class="nav-tab" data-view="notes">📝 Notes</div>

<!-- New view section -->
<div id="notes-view" class="view">
    <div id="notes-list" class="notes-container">
        <!-- Notes grid rendered here -->
    </div>
    <div id="notes-canvas-view" class="notes-canvas-view">
        <!-- Canvas toolbar and drawing area -->
    </div>
</div>

<!-- In <script> section -->
<script>
    // Notes Manager Class
    // DrawingCanvas Class
    // Event handlers
    // View switching logic
</script>
```

Estimated additional code:
- CSS: ~300 lines
- JavaScript: ~600 lines
- HTML structure: ~50 lines

**Total:** ~950 lines added to index.html

---

## 8. Browser Compatibility

| Browser | Pointer Events | Pressure | Full Support |
|---------|---------------|----------|--------------|
| Safari (iPadOS 13+) | ✅ | ✅ | ✅ |
| Chrome (Android) | ✅ | ✅ | ✅ |
| Edge (Surface) | ✅ | ✅ | ✅ |
| Firefox | ✅ | ⚠️ Limited | ⚠️ |
| Safari (macOS) | ✅ | ⚠️ Trackpad | ✅ |
| Chrome (Desktop) | ✅ | ⚠️ Mouse only | ✅ |

**Key APIs:**
- `PointerEvent` - Required (supported in all modern browsers)
- `event.pressure` - Optional (graceful fallback to 0.5)
- `event.getCoalescedEvents()` - Optional (smoother on supported)
- `setPointerCapture()` - Required (widely supported)

---

## 9. Testing Checklist

### Functional Tests
- [ ] Create new note
- [ ] Draw with mouse
- [ ] Draw with touch
- [ ] Draw with Apple Pencil (iPadOS)
- [ ] Draw with Surface Pen (Windows)
- [ ] Pressure sensitivity works
- [ ] Palm rejection works
- [ ] Undo/Redo works
- [ ] Note persists after refresh
- [ ] Thumbnail updates correctly
- [ ] Delete note works
- [ ] Search notes works

### Tablet Tests (iPad)
- [ ] PWA installs correctly
- [ ] Full-screen mode works
- [ ] Toolbar toggles on double-tap
- [ ] Two-finger pan works
- [ ] Pinch zoom works
- [ ] Orientation change handled
- [ ] No unwanted scrolling/bouncing

### Performance Tests
- [ ] Smooth drawing at 60fps
- [ ] Large strokes don't lag
- [ ] 50+ notes loads quickly
- [ ] No memory leaks on long sessions

---

## Summary

This design adds a comprehensive Notes feature with digital pen support to Mission Control. The implementation:

1. **Stays single-file** - All code in index.html
2. **Uses native APIs** - Pointer Events + Canvas (no libraries)
3. **Optimizes for tablets** - Palm rejection, full-screen, gestures
4. **Stores efficiently** - Compact JSON in localStorage
5. **Phases delivery** - MVP in 1 week, full features in 3 weeks

Ready for implementation! 🎨
