export type SchemaFormat = 'avro-json' | 'avro-idl' | 'unknown';

export function detectFormat(input: string): SchemaFormat {
	const trimmed = input.trim();
	if (!trimmed) return 'unknown';

	// Try JSON first
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		try {
			const parsed = JSON.parse(trimmed);
			const schemas = Array.isArray(parsed) ? parsed : [parsed];
			const hasAvroType = schemas.some(
				(s: Record<string, unknown>) =>
					typeof s === 'object' &&
					s !== null &&
					(s.type === 'record' || s.type === 'enum' || s.type === 'fixed')
			);
			if (hasAvroType) return 'avro-json';
		} catch {
			// Not valid JSON, fall through to IDL detection
		}
	}

	// Check for IDL patterns
	const idlPatterns = [
		/\bprotocol\s+\w+/,
		/\brecord\s+\w+\s*\{/,
		/\benum\s+\w+\s*\{/,
		/\bfixed\s+\w+\s*\(/
	];

	if (idlPatterns.some((p) => p.test(trimmed))) {
		return 'avro-idl';
	}

	return 'unknown';
}
