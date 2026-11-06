# Gantt Chart & Timeline View — Demo Dataset (`PR #103`)

This directory contains a self-contained test dataset designed to showcase all scheduling rules, dependency routing algorithms, zoom modes, and filtering capabilities introduced in the Gantt Chart & Timeline View.

## Files

- **`seed-demo-data.sh`**: Generates an isolated `.taskrc` and `.task` directory in `/tmp/taskwarrior-webui-demo` using **relative dates** (`today-6d` through `today+28d`) so the timeline is always centered around the current date whenever you run it. Does **not** touch your personal `~/.task` or `~/.taskrc`.
- **`demo-tasks.json`**: Static `task export` JSON snapshot of the 18 demo tasks, suitable for direct inspection or `task import`.

---

## Quick Start

### Option A: Seed with Relative Dates (Recommended)

From the repository root:

```bash
./demo/seed-demo-data.sh
```

This creates `/tmp/taskwarrior-webui-demo/.taskrc` and `/tmp/taskwarrior-webui-demo/.task`.

Start the backend pointed at the isolated demo directory:

```bash
cd backend
TASKRC="/tmp/taskwarrior-webui-demo/.taskrc" TASKDATA="/tmp/taskwarrior-webui-demo/.task" npm run dev
```

And start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

### Option B: Import Static JSON (`demo-tasks.json`)

To import the static JSON snapshot into `/tmp/taskwarrior-webui-demo` instead of running relative-date CLI commands:

```bash
./demo/seed-demo-data.sh /tmp/taskwarrior-webui-demo --from-json
```

Or import directly into any custom `TASKDATA` directory:

```bash
task rc.data.location=/path/to/test-taskdata rc.uda.assignee.type=string import demo/demo-tasks.json
```

---

## Feature Walkthrough & What to Look For

### 1. Horizontal Date Sequencing & Span Resolution (`resolvedTaskDates`)

| Rule | Demo Task(s) | Expected Behavior in Gantt View |
| :--- | :--- | :--- |
| **Rule 1 (`start` + `due`)** | `2. [Span+Active] Database Schema Migration`<br>`3. [Span+Active] GraphQL & REST Gateway` | Spans inclusively from the `start` column through the `due` column. Rendered in **orange** (`#FF9800`) because `start` is set. |
| **Rule 1b (`start` only)** | `4. [Start-Only] OAuth2 Token Service` | Positioned on `start` (`today-2d`) with a 1-day width; rendered in **orange**. |
| **Rule 2 (`due` only)** | `12. [Overlap-Dependent] Theme Dark-Mode Polish`<br>`13. [Tie-Break A] Alpha Telemetry Pipeline` | Falls back to `due` date with a 1-day width; rendered in **blue** (`#2196F3`). |
| **Rule 3 (Dateless + Prerequisites)** | `8. [Chain Step 2] Component Library Wireframes`<br>`9. [Chain Step 3] Interactive Prototype Review`<br>`10. [Chain Step 4] Accessibility Sign-Off` | Has neither `start` nor `due`, so each task automatically positions itself on the day immediately following its latest prerequisite's end date. |
| **Rule 4 (Dateless + No Prerequisites)** | `7. [Chain Step 1] Design Token Audit (Today Fallback)` | Has no `start`, `due`, or `depends`; defaults to **today** (`1-day` span). |

### 2. Multi-Tier Vertical Task Ordering (`sortedTasks`)

 Filter to **All Projects** and enable all status toggles (`?mode=Gantt&status=pending,waiting,completed,deleted`):

1. **Tier 1 (Status)**: Non-deleted tasks (`pending`, `waiting`, `completed`) sort first; `18. [Deleted] Deprecated Flash Widget Export` is grouped at the very bottom despite having `priority:H`.
2. **Tier 2 (Priority)**: `H` > `M` > `L` > no priority (`13. [Tie-Break A]` and `14. [Tie-Break B]`).
3. **Tier 3 (Urgency)**: Descending Taskwarrior urgency score within each priority tier.
4. **Tier 4 (Dependents Count)**: Tasks blocking more downstream tasks sort higher when priority and urgency are tied.
5. **Tier 5 (Alphabetical Tie-Breaker)**: `13. [Tie-Break A] Alpha Telemetry Pipeline` and `14. [Tie-Break B] Beta Telemetry Pipeline` have identical status, priority (none), urgency, and dependents (0), so `Alpha` sorts above `Beta`.

### 3. Non-Overlapping Orthogonal Dependency Routing (`dependencyLinks`)

- **Parallel Channel Allocation (Fan-Out / Fan-In)**:
  - Toggle `completed` status ON (`?mode=Gantt&project=Platform&status=pending,completed`).
  - `1. [Foundation] Core Architecture Spec` fans out to tasks `2`, `3`, and `4`, while tasks `2`, `3`, and `4` fan into `6. [Bridge-Hop] End-to-End API Integration`. Vertical drop segments automatically allocate staggered parallel channels (`9px` apart) so vertical lines never overlap.
- **Semicircular Line-Crossing Bridge Hops**:
  - Look at the converging arrows entering `6. [Bridge-Hop] End-to-End API Integration` and leaving `2. [Span+Active] Database Schema Migration`: horizontal segments jump over intersecting vertical segments using semicircular SVG arc bridges.
- **Obstacle Avoidance**:
  - `5. [Obstacle] Middleware Rate Limiter` sits in the middle rows across `today-1d`..`today+1d`. Vertical dependency lines between upper rows (`1`, `2`, `3`, `4`) and lower row (`6`) route around the task card margin rather than slicing through the card body.
- **Backward / Overlapping Dependency Bypass**:
  - Filter to `Project = Frontend` (`?mode=Gantt&project=Frontend`).
  - `12. [Overlap-Dependent] Theme Dark-Mode Polish` (`due:today+1d`) depends on `11. [Overlap-Prereq] Legacy CSS Deprecation` (`start:today+2d`..`due:today+4d`). Because the prerequisite ends after the dependent starts, the router uses a 5-segment inter-row bypass corridor.

### 4. Interactive Anchor-Based Dependency Creation & Deletion

- **Create a Dependency**: Hover any task bar to reveal its left and right circular anchor handles. Drag (or click-then-click) from the **right** anchor of a prerequisite task to the **left** anchor of a dependent task (or vice versa). Press `Escape` or click the canvas background while dragging to cancel.
- **Delete a Dependency**: Hover over any blue dependency arrow. It highlights in red (`#FF5252`) and displays a stable midpoint `×` button. Click `×` to remove the dependency immediately.

### 5. Multi-Scale Zoom & Calendarless `Sequence` Flow

Use the top-bar zoom chips (`Sequence`, `Day`, `Week`, `Month`):

- **`Sequence` (`?mode=Gantt&zoom=Sequence&project=Frontend`)**: Replaces calendar headers with topological step columns (`Step 1`, `Step 2`, `Step 3`, ...) starting directly on the earliest task with zero past buffer—ideal for viewing `7 -> 8 -> 9 -> 10`.
- **`Day` (`?mode=Gantt`)**: Daily columns around today, expanding automatically to fit earliest/latest tasks.
- **`Week` (`?mode=Gantt&zoom=Week`)**: Weekly columns (`W...`) with a `700px` minimum width, showcasing `15. [Week-Zoom] Staging Load & Chaos Testing`.
- **`Month` (`?mode=Gantt&zoom=Month`)**: Monthly columns with a `1500px` minimum width, showcasing `16. [Month-Zoom] Production v2.0 Cutover Window`.

### 6. Top-Bar Search, Project/Assignee Filters & Status Toggles

- **Project & Assignee Selectors**: Filter between `Platform`, `Frontend`, and `Release` or assignees `alice`, `bob`, and `carol`.
- **Status Multi-Toggle**: Toggle `waiting` to reveal `17. [Waiting] External Security Penetration Audit`, `completed` to reveal `1. [Foundation] Core Architecture Spec` (green bar), and `deleted` to reveal `18. [Deleted] Deprecated Flash Widget Export`.
- **Live Search**: Type `Chain` or `Telemetry` in the search box (`?search=...`) to filter rows reactively while preserving URL state.
