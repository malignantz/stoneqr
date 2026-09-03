/**
 * Shared error type for every payload encoder.
 * Messages are written for the person typing into the form, not for a log file.
 */
export class PayloadError extends Error {
	constructor(message: string, public readonly field?: string) {
		super(message);
		this.name = 'PayloadError';
	}
}
