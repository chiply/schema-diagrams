import type { SchemaGraph } from '../parser/types.ts';
import { parseAvroJson } from '../parser/avro-json-parser.ts';
import { parseAvroIdl } from '../parser/avro-idl-parser.ts';
import { detectFormat, type SchemaFormat } from '../parser/format-detector.ts';
export type { SchemaFormat };

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
		graph: { schemas: [], relationships: [], errors: [{ message: 'Could not detect schema format. Expected Avro JSON or Avro IDL.', severity: 'error' }] },
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

export function renameFieldInSchema(
	code: string,
	format: SchemaFormat,
	schemaName: string,
	oldName: string,
	newName: string
): string {
	if (format === 'avro-json') {
		return renameField(code, schemaName, oldName, newName);
	}
	if (format === 'avro-idl') {
		return renameFieldInIdl(code, schemaName, oldName, newName);
	}
	return code;
}

function renameFieldInIdl(
	code: string,
	schemaName: string,
	oldName: string,
	newName: string
): string {
	const simpleName = schemaName.includes('.') ? schemaName.split('.').pop()! : schemaName;
	const recordPattern = new RegExp(`\\b(?:record|error)\\s+${escapeRegex(simpleName)}\\s*\\{`);
	const match = recordPattern.exec(code);
	if (!match) return code;

	// Find the matching closing brace using brace counting
	let braceDepth = 1;
	let pos = match.index + match[0].length;
	while (pos < code.length && braceDepth > 0) {
		if (code[pos] === '{') braceDepth++;
		else if (code[pos] === '}') braceDepth--;
		if (braceDepth > 0) pos++;
	}

	// Replace the field name within the record body only
	const bodyStart = match.index + match[0].length;
	const bodyEnd = pos;
	const body = code.substring(bodyStart, bodyEnd);
	const fieldPattern = new RegExp(`\\b${escapeRegex(oldName)}(\\s*[;=])`, 'g');
	const newBody = body.replace(fieldPattern, `${newName}$1`);

	return code.substring(0, bodyStart) + newBody + code.substring(bodyEnd);
}

export function generateUniqueFieldName(existingNames: string[]): string {
	const base = 'new_field';
	if (!existingNames.includes(base)) return base;
	let i = 2;
	while (existingNames.includes(`${base}_${i}`)) i++;
	return `${base}_${i}`;
}

export function addField(
	code: string,
	format: SchemaFormat,
	schemaName: string,
	fieldName: string,
	fieldType: string
): string {
	if (format === 'avro-json') {
		return addFieldToSchema(code, schemaName, fieldName, fieldType);
	}
	if (format === 'avro-idl') {
		return addFieldToIdl(code, schemaName, fieldName, fieldType);
	}
	return code;
}

function addFieldToIdl(
	code: string,
	schemaName: string,
	fieldName: string,
	fieldType: string
): string {
	// Try the full qualified name first, then just the simple name
	const simpleName = schemaName.includes('.') ? schemaName.split('.').pop()! : schemaName;
	const recordPattern = new RegExp(`\\b(?:record|error)\\s+${escapeRegex(simpleName)}\\s*\\{`);
	const match = recordPattern.exec(code);
	if (!match) return code;

	// Find the matching closing brace using brace counting
	let braceDepth = 1;
	let pos = match.index + match[0].length;
	while (pos < code.length && braceDepth > 0) {
		if (code[pos] === '{') braceDepth++;
		else if (code[pos] === '}') braceDepth--;
		if (braceDepth > 0) pos++;
	}

	// pos now points to the closing }
	// Determine indentation from the record's fields
	const beforeClose = code.substring(match.index, pos);
	const indentMatch = beforeClose.match(/\n(\s+)\S[^\n]*$/);
	const indent = indentMatch ? indentMatch[1] : '  ';

	const newField = `${indent}${fieldType} ${fieldName};\n`;
	return code.substring(0, pos) + newField + code.substring(pos);
}

export function updateFieldDefaultInSchema(
	code: string,
	format: SchemaFormat,
	schemaName: string,
	fieldName: string,
	newDefault: unknown
): string {
	if (format === 'avro-json') {
		return updateFieldDefault(code, schemaName, fieldName, newDefault);
	}
	if (format === 'avro-idl') {
		return updateFieldDefaultInIdl(code, schemaName, fieldName, newDefault);
	}
	return code;
}

function updateFieldDefault(
	jsonInput: string,
	schemaName: string,
	fieldName: string,
	newDefault: unknown
): string {
	try {
		const parsed = JSON.parse(jsonInput);
		const schemas = Array.isArray(parsed) ? parsed : [parsed];

		const target = findSchemaByName(schemas, schemaName);
		if (target && Array.isArray(target.fields)) {
			const field = target.fields.find(
				(f: Record<string, unknown>) => f.name === fieldName
			);
			if (field) {
				if (newDefault === undefined) {
					delete field.default;
				} else {
					field.default = newDefault;
				}
			}
		}

		return JSON.stringify(Array.isArray(parsed) ? schemas : schemas[0], null, 2);
	} catch {
		return jsonInput;
	}
}

function updateFieldDefaultInIdl(
	code: string,
	schemaName: string,
	fieldName: string,
	newDefault: unknown
): string {
	const simpleName = schemaName.includes('.') ? schemaName.split('.').pop()! : schemaName;
	const recordPattern = new RegExp(`\\b(?:record|error)\\s+${escapeRegex(simpleName)}\\s*\\{`);
	const match = recordPattern.exec(code);
	if (!match) return code;

	// Find the matching closing brace using brace counting
	let braceDepth = 1;
	let pos = match.index + match[0].length;
	while (pos < code.length && braceDepth > 0) {
		if (code[pos] === '{') braceDepth++;
		else if (code[pos] === '}') braceDepth--;
		if (braceDepth > 0) pos++;
	}

	const bodyStart = match.index + match[0].length;
	const bodyEnd = pos;
	const body = code.substring(bodyStart, bodyEnd);

	// Match field line: captures everything up to fieldName, optional existing default, and semicolon
	const fieldEsc = escapeRegex(fieldName);
	const fieldPattern = new RegExp(
		`(\\b${fieldEsc})(\\s*=\\s*[^;]*)?(\\s*;)`, 'g'
	);
	const newBody = body.replace(fieldPattern, (_m, name, _existingDefault, semi) => {
		if (newDefault === undefined) {
			// Remove default
			return `${name}${semi}`;
		}
		return `${name} = ${formatIdlDefault(newDefault)}${semi}`;
	});

	return code.substring(0, bodyStart) + newBody + code.substring(bodyEnd);
}

function formatIdlDefault(value: unknown): string {
	if (value === null) return 'null';
	if (value === true) return 'true';
	if (value === false) return 'false';
	if (typeof value === 'number') return String(value);
	if (typeof value === 'object') {
		if (Array.isArray(value)) return '[]';
		return '{}';
	}
	return `"${String(value)}"`;
}

export function updateFieldTypeInSchema(
	code: string,
	format: SchemaFormat,
	schemaName: string,
	fieldName: string,
	newType: string
): string {
	if (format === 'avro-json') {
		return updateFieldType(code, schemaName, fieldName, newType);
	}
	if (format === 'avro-idl') {
		return updateFieldTypeInIdl(code, schemaName, fieldName, newType);
	}
	return code;
}

function updateFieldType(
	jsonInput: string,
	schemaName: string,
	fieldName: string,
	newType: string
): string {
	try {
		const parsed = JSON.parse(jsonInput);
		const schemas = Array.isArray(parsed) ? parsed : [parsed];

		const target = findSchemaByName(schemas, schemaName);
		if (target && Array.isArray(target.fields)) {
			const field = target.fields.find(
				(f: Record<string, unknown>) => f.name === fieldName
			);
			if (field) {
				if (typeof field.type === 'string') {
					// Simple type: "string" → "int"
					field.type = newType;
				} else if (
					Array.isArray(field.type) &&
					field.type.length === 2 &&
					field.type[0] === 'null'
				) {
					// Nullable: ["null", "string"] → ["null", "int"]
					field.type = ['null', newType];
				}
			}
		}

		return JSON.stringify(Array.isArray(parsed) ? schemas : schemas[0], null, 2);
	} catch {
		return jsonInput;
	}
}

function updateFieldTypeInIdl(
	code: string,
	schemaName: string,
	fieldName: string,
	newType: string
): string {
	const simpleName = schemaName.includes('.') ? schemaName.split('.').pop()! : schemaName;
	const recordPattern = new RegExp(`\\b(?:record|error)\\s+${escapeRegex(simpleName)}\\s*\\{`);
	const match = recordPattern.exec(code);
	if (!match) return code;

	// Find the matching closing brace using brace counting
	let braceDepth = 1;
	let pos = match.index + match[0].length;
	while (pos < code.length && braceDepth > 0) {
		if (code[pos] === '{') braceDepth++;
		else if (code[pos] === '}') braceDepth--;
		if (braceDepth > 0) pos++;
	}

	const bodyStart = match.index + match[0].length;
	const bodyEnd = pos;
	const body = code.substring(bodyStart, bodyEnd);

	const fieldEsc = escapeRegex(fieldName);

	// Pattern 1: union { null, oldType } fieldName
	const unionPattern = new RegExp(
		`(union\\s*\\{\\s*null\\s*,\\s*)\\w+(\\s*\\}\\s+${fieldEsc}\\b)`
	);
	if (unionPattern.test(body)) {
		const newBody = body.replace(unionPattern, `$1${newType}$2`);
		return code.substring(0, bodyStart) + newBody + code.substring(bodyEnd);
	}

	// Pattern 2: oldType? fieldName  (nullable shorthand)
	const nullablePattern = new RegExp(
		`(^|\\n)(\\s*)\\w+(\\?\\s+${fieldEsc}\\b)`, 'm'
	);
	if (nullablePattern.test(body)) {
		const newBody = body.replace(nullablePattern, `$1$2${newType}$3`);
		return code.substring(0, bodyStart) + newBody + code.substring(bodyEnd);
	}

	// Pattern 3: simple type  oldType fieldName
	const simplePattern = new RegExp(
		`(^|\\n)(\\s*)\\w+(\\s+${fieldEsc}\\b)`, 'm'
	);
	if (simplePattern.test(body)) {
		const newBody = body.replace(simplePattern, `$1$2${newType}$3`);
		return code.substring(0, bodyStart) + newBody + code.substring(bodyEnd);
	}

	return code;
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateUniqueSymbolName(existingSymbols: string[]): string {
	const base = 'NEW_SYMBOL';
	if (!existingSymbols.includes(base)) return base;
	let i = 2;
	while (existingSymbols.includes(`${base}_${i}`)) i++;
	return `${base}_${i}`;
}

export function addSymbol(
	code: string,
	format: SchemaFormat,
	schemaName: string,
	symbolName: string
): string {
	if (format === 'avro-json') {
		return addSymbolToSchema(code, schemaName, symbolName);
	}
	if (format === 'avro-idl') {
		return addSymbolToEnumIdl(code, schemaName, symbolName);
	}
	return code;
}

function addSymbolToSchema(
	jsonInput: string,
	schemaName: string,
	symbolName: string
): string {
	try {
		const parsed = JSON.parse(jsonInput);
		const schemas = Array.isArray(parsed) ? parsed : [parsed];

		const target = findSchemaByName(schemas, schemaName);
		if (target && Array.isArray(target.symbols)) {
			target.symbols.push(symbolName);
		}

		return JSON.stringify(Array.isArray(parsed) ? schemas : schemas[0], null, 2);
	} catch {
		return jsonInput;
	}
}

function addSymbolToEnumIdl(
	code: string,
	schemaName: string,
	symbolName: string
): string {
	const simpleName = schemaName.includes('.') ? schemaName.split('.').pop()! : schemaName;
	const enumPattern = new RegExp(`\\benum\\s+${escapeRegex(simpleName)}\\s*\\{`);
	const match = enumPattern.exec(code);
	if (!match) return code;

	// Find the matching closing brace using brace counting
	let braceDepth = 1;
	let pos = match.index + match[0].length;
	while (pos < code.length && braceDepth > 0) {
		if (code[pos] === '{') braceDepth++;
		else if (code[pos] === '}') braceDepth--;
		if (braceDepth > 0) pos++;
	}

	// pos now points to the closing }
	// Check if there are existing symbols to determine if we need a comma
	const body = code.substring(match.index + match[0].length, pos);
	const existingSymbols = body.trim();
	const needsComma = existingSymbols.length > 0 && !existingSymbols.endsWith(',');

	// Determine indentation from the enum's symbols
	const beforeClose = code.substring(match.index, pos);
	const indentMatch = beforeClose.match(/\n(\s+)\S[^\n]*$/);
	const indent = indentMatch ? indentMatch[1] : '  ';

	const prefix = needsComma ? `,\n` : '';
	const newSymbol = `${prefix}${indent}${symbolName}\n`;
	return code.substring(0, pos) + newSymbol + code.substring(pos);
}

export function renameSymbolInSchema(
	code: string,
	format: SchemaFormat,
	schemaName: string,
	oldName: string,
	newName: string
): string {
	if (format === 'avro-json') {
		return renameSymbolInJson(code, schemaName, oldName, newName);
	}
	if (format === 'avro-idl') {
		return renameSymbolInIdl(code, schemaName, oldName, newName);
	}
	return code;
}

function renameSymbolInJson(
	jsonInput: string,
	schemaName: string,
	oldName: string,
	newName: string
): string {
	try {
		const parsed = JSON.parse(jsonInput);
		const schemas = Array.isArray(parsed) ? parsed : [parsed];

		const target = findSchemaByName(schemas, schemaName);
		if (target && Array.isArray(target.symbols)) {
			const idx = target.symbols.indexOf(oldName);
			if (idx !== -1) {
				target.symbols[idx] = newName;
			}
		}

		return JSON.stringify(Array.isArray(parsed) ? schemas : schemas[0], null, 2);
	} catch {
		return jsonInput;
	}
}

function renameSymbolInIdl(
	code: string,
	schemaName: string,
	oldName: string,
	newName: string
): string {
	const simpleName = schemaName.includes('.') ? schemaName.split('.').pop()! : schemaName;
	const enumPattern = new RegExp(`\\benum\\s+${escapeRegex(simpleName)}\\s*\\{`);
	const match = enumPattern.exec(code);
	if (!match) return code;

	// Find the matching closing brace using brace counting
	let braceDepth = 1;
	let pos = match.index + match[0].length;
	while (pos < code.length && braceDepth > 0) {
		if (code[pos] === '{') braceDepth++;
		else if (code[pos] === '}') braceDepth--;
		if (braceDepth > 0) pos++;
	}

	// Replace the symbol name within the enum body only
	const bodyStart = match.index + match[0].length;
	const bodyEnd = pos;
	const body = code.substring(bodyStart, bodyEnd);
	const symbolPattern = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g');
	const newBody = body.replace(symbolPattern, newName);

	return code.substring(0, bodyStart) + newBody + code.substring(bodyEnd);
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
