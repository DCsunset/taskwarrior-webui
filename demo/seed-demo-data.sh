#!/usr/bin/env bash
# Seed an isolated Taskwarrior dataset to demonstrate all Gantt Chart & UI features (PR #103).
# Works with both Taskwarrior 2.x and 3.x and does NOT touch ~/.task or ~/.taskrc.
#
# Usage:
#   ./demo/seed-demo-data.sh [target_dir] [--from-json]
#
# Default target_dir: /tmp/taskwarrior-webui-demo

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/tmp/taskwarrior-webui-demo"
FROM_JSON=false

for arg in "$@"; do
	if [ "$arg" = "--from-json" ]; then
		FROM_JSON=true
	else
		TARGET_DIR="$arg"
	fi
done

export TASKDATA="$TARGET_DIR/.task"
export TASKRC="$TARGET_DIR/.taskrc"

rm -rf "$TARGET_DIR"
mkdir -p "$TASKDATA"

cat > "$TASKRC" <<EOF
data.location=$TASKDATA
confirmation=off
verbose=nothing
uda.assignee.type=string
uda.assignee.label=Assignee
EOF

run_task() {
	task rc:"$TASKRC" rc.data.location:"$TASKDATA" rc.confirmation:off "$@"
}

add_task_uuid() {
	local output
	output="$(task rc:"$TASKRC" rc.data.location:"$TASKDATA" rc.confirmation:off rc.verbose:new-uuid add "$@")"
	echo "$output" | sed -n 's/.*Created task \([0-9a-fA-F-]*\)\..*/\1/p' | head -n 1
}

if [ "$FROM_JSON" = true ]; then
	echo "Importing static dataset from $SCRIPT_DIR/demo-tasks.json into $TARGET_DIR ..."
	run_task import "$SCRIPT_DIR/demo-tasks.json" >/dev/null
else
	echo "Generating relative-date Gantt demo dataset in $TARGET_DIR ..."

	# =========================================================================
	# 1. Completed Prerequisite Foundation (Project: Platform)
	#    Demonstrates:
	#    - Completed status (green bar when 'completed' filter is enabled)
	#    - Prerequisite Map Preservation (downstream pending tasks still resolve
	#      dates from this task even when 'completed' filter is toggled off)
	#    - Multi-branch fan-out (blocks 3 tasks -> elevated in Tier 4 sorting
	#      and allocates staggered parallel vertical arrow channels)
	# =========================================================================
	UUID_FOUNDATION="$(add_task_uuid \
		"1. [Foundation] Core Architecture Spec" \
		project:Platform priority:H assignee:alice +spec \
		start:today-6d due:today-4d)"
	run_task "$UUID_FOUNDATION" done >/dev/null
	run_task "$UUID_FOUNDATION" annotate "Approved architecture spec; unblocks API, Schema, and Auth tracks" >/dev/null

	# =========================================================================
	# 2. Multi-Day Active/Started Span & Fan-Out Dependents (Project: Platform)
	#    Demonstrates:
	#    - Rule 1 (start + due): Inclusive multi-day bar spanning across today
	#    - Orange "In Progress" bar coloring (task has start date)
	#    - Fan-out channel staggering from Foundation (3 arrows leaving Foundation)
	#    - Obstacle creation for cross-row arrow routing
	# =========================================================================
	UUID_SCHEMA="$(add_task_uuid \
		"2. [Span+Active] Database Schema Migration" \
		project:Platform priority:H assignee:alice +db \
		start:today-3d due:today-1d \
		depends:"$UUID_FOUNDATION")"
	run_task "$UUID_SCHEMA" annotate "Spans 3 inclusive days (start + due set)" >/dev/null

	UUID_API="$(add_task_uuid \
		"3. [Span+Active] GraphQL & REST Gateway" \
		project:Platform priority:H assignee:bob +api \
		start:today-1d due:today+2d \
		depends:"$UUID_FOUNDATION,$UUID_SCHEMA")"
	run_task "$UUID_API" annotate "Active multi-day task spanning across today" >/dev/null

	UUID_AUTH="$(add_task_uuid \
		"4. [Start-Only] OAuth2 Token Service" \
		project:Platform priority:M assignee:carol +security \
		start:today-2d \
		depends:"$UUID_FOUNDATION")"
	run_task "$UUID_AUTH" annotate "Rule 1b: Has start date only (no due date) -> 1-day orange bar" >/dev/null

	# =========================================================================
	# 3. Obstacle Avoidance & Line-Crossing Bridge Hops (Project: Platform)
	#    Demonstrates:
	#    - Intermediate task card sitting between upper and lower rows so
	#      vertical dependency lines divert around the card body
	#    - Crossing horizontal & vertical dependency segments rendering
	#      semicircular SVG bridge hops
	# =========================================================================
	UUID_OBSTACLE="$(add_task_uuid \
		"5. [Obstacle] Middleware Rate Limiter" \
		project:Platform priority:M assignee:bob +ops \
		start:today-1d due:today+1d)"
	run_task "$UUID_OBSTACLE" annotate "Sits in middle row/columns to demonstrate obstacle avoidance routing" >/dev/null

	UUID_INTEGRATION="$(add_task_uuid \
		"6. [Bridge-Hop] End-to-End API Integration" \
		project:Platform priority:L assignee:alice +qa \
		start:today+3d due:today+5d \
		depends:"$UUID_SCHEMA,$UUID_API,$UUID_AUTH")"
	run_task "$UUID_INTEGRATION" annotate "Converges multiple upstream tracks; shows staggered channels & bridge hops" >/dev/null

	# =========================================================================
	# 4. Dateless Topological Chain (Project: Frontend)
	#    Demonstrates:
	#    - Rule 3 (No start, no due, has depends): Automatically sequences each
	#      task immediately after the completion/end of its latest prerequisite
	#    - Sequence Zoom mode (?mode=Gantt&zoom=Sequence): Clean topological
	#      Step 1 -> Step 2 -> Step 3 -> Step 4 progression
	# =========================================================================
	UUID_CHAIN_1="$(add_task_uuid \
		"7. [Chain Step 1] Design Token Audit (Today Fallback)" \
		project:Frontend priority:H assignee:carol +ui)"
	run_task "$UUID_CHAIN_1" annotate "Rule 4: No start, no due, no prerequisite -> defaults to Today" >/dev/null

	UUID_CHAIN_2="$(add_task_uuid \
		"8. [Chain Step 2] Component Library Wireframes" \
		project:Frontend priority:H assignee:carol +ui \
		depends:"$UUID_CHAIN_1")"
	run_task "$UUID_CHAIN_2" annotate "Rule 3: Dateless task auto-scheduled after Step 1" >/dev/null

	UUID_CHAIN_3="$(add_task_uuid \
		"9. [Chain Step 3] Interactive Prototype Review" \
		project:Frontend priority:M assignee:alice +ui \
		depends:"$UUID_CHAIN_2")"
	run_task "$UUID_CHAIN_3" annotate "Rule 3: Dateless task auto-scheduled after Step 2" >/dev/null

	UUID_CHAIN_4="$(add_task_uuid \
		"10. [Chain Step 4] Accessibility Sign-Off" \
		project:Frontend priority:L assignee:bob +ui \
		depends:"$UUID_CHAIN_3")"
	run_task "$UUID_CHAIN_4" annotate "Rule 3: Dateless task auto-scheduled after Step 3" >/dev/null

	# =========================================================================
	# 5. Backward / Overlapping Dependency Routing (Project: Frontend)
	#    Demonstrates:
	#    - Backward 5-segment bypass routing when a dependent task's date is
	#      earlier than or overlaps its prerequisite's end date
	# =========================================================================
	UUID_OVERLAP_PREREQ="$(add_task_uuid \
		"11. [Overlap-Prereq] Legacy CSS Deprecation" \
		project:Frontend priority:M assignee:bob +cleanup \
		start:today+2d due:today+4d)"

	UUID_OVERLAP_DEP="$(add_task_uuid \
		"12. [Overlap-Dependent] Theme Dark-Mode Polish" \
		project:Frontend priority:M assignee:alice +ui \
		due:today+1d \
		depends:"$UUID_OVERLAP_PREREQ")"
	run_task "$UUID_OVERLAP_DEP" annotate "Scheduled before prerequisite finishes -> triggers 5-segment inter-row bypass" >/dev/null

	# =========================================================================
	# 6. Multi-Tier Sorting Tie-Breakers & Multi-Scale Zoom (Project: Release)
	#    Demonstrates:
	#    - Tier 4 (Dependents count) & Tier 5 (Alphabetical description) sorting
	#    - Week & Month zoom horizons (tasks scheduled +12d and +28d ahead)
	#    - Waiting & Deleted status toggles
	# =========================================================================
	UUID_TIE_A="$(add_task_uuid \
		"13. [Tie-Break A] Alpha Telemetry Pipeline" \
		project:Release assignee:alice \
		due:today+6d)"

	UUID_TIE_B="$(add_task_uuid \
		"14. [Tie-Break B] Beta Telemetry Pipeline" \
		project:Release assignee:alice \
		due:today+6d)"

	UUID_WEEK_HORIZON="$(add_task_uuid \
		"15. [Week-Zoom] Staging Load & Chaos Testing" \
		project:Release priority:M assignee:bob +perf \
		start:today+9d due:today+13d \
		depends:"$UUID_INTEGRATION")"

	UUID_MONTH_HORIZON="$(add_task_uuid \
		"16. [Month-Zoom] Production v2.0 Cutover Window" \
		project:Release priority:H assignee:alice +release \
		start:today+24d due:today+28d \
		depends:"$UUID_WEEK_HORIZON")"

	UUID_WAITING="$(add_task_uuid \
		"17. [Waiting] External Security Penetration Audit" \
		project:Release priority:M assignee:carol +security \
		wait:today+5d due:today+10d \
		depends:"$UUID_AUTH")"
	run_task "$UUID_WAITING" annotate "Visible when 'waiting' status toggle is selected" >/dev/null

	UUID_DELETED="$(add_task_uuid \
		"18. [Deleted] Deprecated Flash Widget Export" \
		project:Release priority:H assignee:bob \
		due:today+2d)"
	run_task "$UUID_DELETED" delete >/dev/null
fi

cat <<EOF

===============================================================================
Demo dataset ready!
  TASKRC   = $TASKRC
  TASKDATA = $TASKDATA
===============================================================================

To start the backend with this isolated dataset:
  cd backend
  TASKRC="$TASKRC" TASKDATA="$TASKDATA" npm run dev

Then in another terminal, start the frontend (if not already running):
  cd frontend
  npm run dev

Open in browser:
  - Gantt Day View:      http://localhost:8080/?mode=Gantt
  - Gantt Sequence View: http://localhost:8080/?mode=Gantt&zoom=Sequence
  - Gantt Week View:     http://localhost:8080/?mode=Gantt&zoom=Week
  - Gantt Month View:    http://localhost:8080/?mode=Gantt&zoom=Month
  - All Statuses:        http://localhost:8080/?mode=Gantt&status=pending,waiting,completed,deleted
===============================================================================
EOF
