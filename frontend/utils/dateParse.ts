import moment, { Moment } from 'moment';

const DATE_FORMATS = [
	moment.ISO_8601,
	'YYYYMMDD[T]HHmmss[Z]',
	'YYYYMMDD[T]HHmmss',
	'YYYYMMDD',
	'YYYY-MM-DDTHH:mm:ssZ',
	'YYYY-MM-DDTHH:mm:ss',
	'YYYY-MM-DD HH:mm:ss',
	'YYYY-MM-DD HH:mm',
	'YYYY-MM-DD',
	'YYYY/MM/DD',
	'DD/MM/YYYY',
	'D/M/YYYY',
	'DD-MM-YYYY',
	'D-M-YYYY'
];

export const parseDateValue = (value: string): Moment | null => {
	const input = value.trim();
	if (!input) return null;
	const parsed = moment(input, DATE_FORMATS, true);
	return parsed.isValid() ? parsed : null;
};

export const combineDateTime = (date: string, time: string): string => {
	return moment(
		`${date}T${time}:00`,
		'YYYY-MM-DDTHH:mm:ss',
		true
	).format('YYYY-MM-DDTHH:mm:ssZ');
};
