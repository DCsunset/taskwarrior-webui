import urlRegex from 'url-regex-safe';
import normalizeUrl from 'normalize-url';

/**
 * Validates whether a candidate string is a well-formed URL.
 */
export function isValidUrl(candidate: string): boolean {
	if (!candidate || typeof candidate !== 'string') return false;
	try {
		const normalized = normalizeUrl(candidate);
		const parsed = new URL(normalized);
		// Require a standard web protocol and a valid hostname
		return ['http:', 'https:', 'ftp:'].includes(parsed.protocol) && Boolean(parsed.hostname);
	}
	catch {
		return false;
	}
}

/**
 * Safely converts URLs in plain text into clickable HTML anchor tags.
 * Only explicit schemes (http, https, ftp) or standard hostnames (www.*) are matched,
 * strictly ignoring colons and pseudo-schemes such as 'Doug::'.
 */
export function linkify(text?: string): string {
	if (!text) return '';

	// strict: true prevents matching arbitrary colons or pseudo-schemes
	const regex = urlRegex({ strict: true });
	let match: RegExpExecArray | null;
	let lastIndex = 0;
	let result = '';

	while ((match = regex.exec(text)) !== null) {
		const rawMatch = match[0];
		const precedingText = text.substring(lastIndex, match.index);

		if (isValidUrl(rawMatch)) {
			let href = rawMatch;
			try {
				href = normalizeUrl(rawMatch);
			}
			catch {
				href = rawMatch;
			}
			const anchor = `<a target="_blank" rel="noopener noreferrer" href="${href}">${rawMatch}</a>`;
			result = `${result}${precedingText}${anchor}`;
		}
		else {
			// Fallback to literal text if candidate fails URL verification
			result = `${result}${precedingText}${rawMatch}`;
		}

		lastIndex = match.index + rawMatch.length;
	}

	result += text.substring(lastIndex);
	return result;
}
