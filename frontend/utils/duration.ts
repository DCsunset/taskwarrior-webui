import moment from 'moment';

export function formatDuration(seconds: number): string {
	if (!seconds || seconds <= 0) return '0s';
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hrs > 0) {
		return `${hrs}h ${mins}m ${secs}s`;
	} else if (mins > 0) {
		return `${mins}m ${secs}s`;
	}
	return `${secs}s`;
}

export function parseTaskDate(dateStr?: string): number | null {
	if (!dateStr) return null;
	// ISO string or Taskwarrior compact date e.g. 20260924T150000Z
	if (dateStr.length === 16 && dateStr.includes('T')) {
		const formatted = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T${dateStr.slice(9, 11)}:${dateStr.slice(11, 13)}:${dateStr.slice(13, 15)}Z`;
		return new Date(formatted).getTime();
	}
	const timestamp = new Date(dateStr).getTime();
	return isNaN(timestamp) ? null : timestamp;
}

export function getActiveElapsedSeconds(startDateStr?: string): number {
	const startTime = parseTaskDate(startDateStr);
	if (!startTime) return 0;
	return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
}
