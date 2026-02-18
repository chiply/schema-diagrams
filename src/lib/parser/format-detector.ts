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
			// JSON parse failed, but if it looks like JSON with Avro keywords,
			// still treat as avro-json so the parser can report positioned errors
			if (/"type"\s*:\s*"(record|enum|fixed)"/.test(trimmed)) {
				return 'avro-json';
			}
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
