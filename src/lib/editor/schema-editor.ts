import type { SchemaGraph } from '../parser/types.ts';
import { parseAvroJson } from '../parser/avro-json-parser.ts';
import { parseAvroIdl } from '../parser/avro-idl-parser.ts';
import { detectFormat, type SchemaFormat } from '../parser/format-detector.ts';

export interface ParseResult {
	graph: SchemaGraph;
	format: SchemaFormat;
}

export function parseSchema(input: string): ParseResult {
	const format = detectFormat(input);

	if (format === 'avro-json') {
		return { graph: parseAvroJson(input), format };
	}

	if (format === 'avro-idl') {
		return { graph: parseAvroIdl(input), format };
	}

	return {
		graph: { schemas: [], relationships: [], errors: ['Could not detect schema format. Expected Avro JSON or Avro IDL.'] },
		format: 'unknown'
	};
}

export function addFieldToSchema(
	jsonInput: string,
	schemaName: string,
	fieldName: string,
	fieldType: string
): string {
	try {
		const parsed = JSON.parse(jsonInput);
		const schemas = Array.isArray(parsed) ? parsed : [parsed];

		const target = findSchemaByName(schemas, schemaName);
		if (target && Array.isArray(target.fields)) {
			target.fields.push({
				name: fieldName,
				type: fieldType
			});
		}

		return JSON.stringify(Array.isArray(parsed) ? schemas : schemas[0], null, 2);
	} catch {
		return jsonInput;
	}
}

export function removeFieldFromSchema(
	jsonInput: string,
	schemaName: string,
	fieldName: string
): string {
	try {
		const parsed = JSON.parse(jsonInput);
		const schemas = Array.isArray(parsed) ? parsed : [parsed];

		const target = findSchemaByName(schemas, schemaName);
		if (target && Array.isArray(target.fields)) {
			target.fields = target.fields.filter(
				(f: Record<string, unknown>) => f.name !== fieldName
			);
		}

		return JSON.stringify(Array.isArray(parsed) ? schemas : schemas[0], null, 2);
	} catch {
		return jsonInput;
	}
}

export function renameField(
	jsonInput: string,
	schemaName: string,
	oldName: string,
	newName: string
): string {
	try {
		const parsed = JSON.parse(jsonInput);
		const schemas = Array.isArray(parsed) ? parsed : [parsed];

		const target = findSchemaByName(schemas, schemaName);
		if (target && Array.isArray(target.fields)) {
			const field = target.fields.find(
				(f: Record<string, unknown>) => f.name === oldName
			);
			if (field) {
				field.name = newName;
			}
		}

		return JSON.stringify(Array.isArray(parsed) ? schemas : schemas[0], null, 2);
	} catch {
		return jsonInput;
	}
}

function findSchemaByName(
	schemas: Record<string, unknown>[],
	name: string
): Record<string, unknown> | undefined {
	for (const schema of schemas) {
		if (schema.name === name) return schema;
		const qualifiedName = schema.namespace ? `${schema.namespace}.${schema.name}` : schema.name;
		if (qualifiedName === name) return schema;

		// Search nested types in fields
		if (Array.isArray(schema.fields)) {
			for (const field of schema.fields as Record<string, unknown>[]) {
				const fieldType = field.type;
				if (typeof fieldType === 'object' && fieldType !== null && !Array.isArray(fieldType)) {
					const nested = findSchemaByName([fieldType as Record<string, unknown>], name);
					if (nested) return nested;
				}
			}
		}
	}
	return undefined;
}
