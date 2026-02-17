import type { SchemaGraph, SchemaEntity, SchemaField, FieldType, Relationship } from './types.ts';

/**
 * Lightweight Avro IDL (.avdl) parser.
 * Supports: protocol, record, enum, fixed, field types, unions, arrays, maps, annotations.
 */

interface Token {
	type: 'keyword' | 'ident' | 'string' | 'number' | 'symbol' | 'annotation';
	value: string;
	pos: number;
}

export function parseAvroIdl(input: string): SchemaGraph {
	const schemas: SchemaEntity[] = [];
	const relationships: Relationship[] = [];
	const errors: string[] = [];
	const namedTypes = new Map<string, SchemaEntity>();

	try {
		const tokens = tokenize(input);
		const parser = new IdlParser(tokens, schemas, relationships, namedTypes, errors);
		parser.parse();
	} catch (e) {
		errors.push(`IDL parse error: ${e instanceof Error ? e.message : String(e)}`);
	}

	return { schemas, relationships, errors };
}

function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < input.length) {
		// Skip whitespace
		if (/\s/.test(input[i])) {
			i++;
			continue;
		}

		// Skip line comments
		if (input[i] === '/' && input[i + 1] === '/') {
			while (i < input.length && input[i] !== '\n') i++;
			continue;
		}

		// Skip block comments
		if (input[i] === '/' && input[i + 1] === '*') {
			i += 2;
			while (i < input.length - 1 && !(input[i] === '*' && input[i + 1] === '/')) i++;
			i += 2;
			continue;
		}

		// Annotation (@keyword)
		if (input[i] === '@') {
			const start = i;
			i++;
			while (i < input.length && /[a-zA-Z0-9_.-]/.test(input[i])) i++;
			tokens.push({ type: 'annotation', value: input.substring(start, i), pos: start });
			continue;
		}

		// String literal
		if (input[i] === '"') {
			const start = i;
			i++;
			while (i < input.length && input[i] !== '"') {
				if (input[i] === '\\') i++;
				i++;
			}
			i++; // closing quote
			tokens.push({ type: 'string', value: input.substring(start + 1, i - 1), pos: start });
			continue;
		}

		// Number
		if (/[0-9]/.test(input[i]) || (input[i] === '-' && i + 1 < input.length && /[0-9]/.test(input[i + 1]))) {
			const start = i;
			if (input[i] === '-') i++;
			while (i < input.length && /[0-9.]/.test(input[i])) i++;
			tokens.push({ type: 'number', value: input.substring(start, i), pos: start });
			continue;
		}

		// Identifier or keyword
		if (/[a-zA-Z_]/.test(input[i])) {
			const start = i;
			while (i < input.length && /[a-zA-Z0-9_.]/.test(input[i])) i++;
			const value = input.substring(start, i);
			const keywords = new Set([
				'protocol', 'record', 'enum', 'fixed', 'union', 'array', 'map',
				'null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string',
				'void', 'import', 'idl', 'schema', 'throws', 'oneway', 'error', 'date',
				'time_ms', 'timestamp_ms', 'decimal', 'uuid'
			]);
			tokens.push({
				type: keywords.has(value) ? 'keyword' : 'ident',
				value,
				pos: start
			});
			continue;
		}

		// Symbols
		if ('<>{}()[];,=?'.includes(input[i])) {
			tokens.push({ type: 'symbol', value: input[i], pos: i });
			i++;
			continue;
		}

		// Skip unknown
		i++;
	}

	return tokens;
}

class IdlParser {
	private pos = 0;
	private currentNamespace: string | undefined;

	constructor(
		private tokens: Token[],
		private schemas: SchemaEntity[],
		private relationships: Relationship[],
		private namedTypes: Map<string, SchemaEntity>,
		private errors: string[]
	) {}

	parse(): void {
		while (this.pos < this.tokens.length) {
			const token = this.peek();
			if (!token) break;

			if (token.value === 'protocol') {
				this.parseProtocol();
			} else if (token.value === 'record' || token.value === 'error') {
				this.parseRecord(undefined);
			} else if (token.value === 'enum') {
				this.parseEnum(undefined);
			} else if (token.value === 'fixed') {
				this.parseFixed(undefined);
			} else if (token.type === 'annotation') {
				this.advance(); // skip top-level annotations
			} else {
				this.advance();
			}
		}
	}

	private parseProtocol(): void {
		this.expect('protocol');
		const name = this.advance(); // protocol name
		if (name) {
			this.currentNamespace = name.value;
		}
		this.expect('{');

		while (this.pos < this.tokens.length) {
			const token = this.peek();
			if (!token || token.value === '}') break;

			if (token.value === '@namespace') {
				this.advance();
				this.expect('(');
				const ns = this.advance();
				if (ns) this.currentNamespace = ns.value;
				this.expect(')');
				this.consumeIf(';');
			} else if (token.value === 'record' || token.value === 'error') {
				this.parseRecord(undefined);
			} else if (token.value === 'enum') {
				this.parseEnum(undefined);
			} else if (token.value === 'fixed') {
				this.parseFixed(undefined);
			} else if (token.type === 'annotation') {
				this.advance(); // skip annotations on protocol members for now
				// Consume annotation arguments if present
				if (this.peek()?.value === '(') {
					this.advance();
					let depth = 1;
					while (this.pos < this.tokens.length && depth > 0) {
						const t = this.advance();
						if (t?.value === '(') depth++;
						if (t?.value === ')') depth--;
					}
				}
			} else {
				// Skip method declarations and other tokens
				this.advance();
			}
		}

		this.consumeIf('}');
	}

	private parseRecord(parentId: string | undefined): void {
		const keyword = this.advance(); // 'record' or 'error'
		const nameToken = this.advance();
		if (!nameToken) return;

		const name = nameToken.value;
		const namespace = this.currentNamespace;
		const id = namespace ? `${namespace}.${name}` : name;

		const entity: SchemaEntity = {
			id,
			name,
			namespace,
			type: 'record',
			fields: [],
			isNested: parentId !== undefined,
			parentSchema: parentId
		};
		this.namedTypes.set(id, entity);
		this.schemas.push(entity);

		if (parentId) {
			this.relationships.push({
				id: `nested-${parentId}-${id}`,
				sourceSchema: parentId,
				sourceField: name,
				targetSchema: id,
				type: 'nested',
				label: 'contains'
			});
		}

		this.expect('{');

		while (this.pos < this.tokens.length) {
			const token = this.peek();
			if (!token || token.value === '}') break;

			// Handle nested type definitions
			if (token.value === 'record' || token.value === 'error') {
				this.parseRecord(id);
			} else if (token.value === 'enum') {
				this.parseEnum(id);
			} else if (token.value === 'fixed') {
				this.parseFixed(id);
			} else if (token.type === 'annotation') {
				this.advance();
				if (this.peek()?.value === '(') {
					this.advance();
					let depth = 1;
					while (this.pos < this.tokens.length && depth > 0) {
						const t = this.advance();
						if (t?.value === '(') depth++;
						if (t?.value === ')') depth--;
					}
				}
			} else {
				// Parse field: type fieldName [= default] ;
				const field = this.parseField(id);
				if (field) {
					entity.fields!.push(field);
				}
			}
		}

		this.consumeIf('}');
	}

	private parseField(parentId: string): SchemaField | undefined {
		const fieldType = this.parseType(parentId);
		if (!fieldType) return undefined;

		const nameToken = this.advance();
		if (!nameToken) return undefined;

		// Skip default value
		if (this.peek()?.value === '=') {
			this.advance(); // =
			// Skip until ;
			while (this.pos < this.tokens.length && this.peek()?.value !== ';') {
				this.advance();
			}
		}

		this.consumeIf(';');

		// Create reference relationships for named type references
		if (fieldType.isReference && fieldType.referencedSchema) {
			const existingRel = this.relationships.find(
				(r) => r.id === `ref-${parentId}.${nameToken.value}-${fieldType.referencedSchema}`
			);
			if (!existingRel) {
				this.relationships.push({
					id: `ref-${parentId}.${nameToken.value}-${fieldType.referencedSchema}`,
					sourceSchema: parentId,
					sourceField: nameToken.value,
					targetSchema: fieldType.referencedSchema,
					type: 'reference',
					cardinality: fieldType.isArray ? '1:N' : '1:1'
				});
			}
		}

		return {
			name: nameToken.value,
			type: fieldType
		};
	}

	private parseType(parentId: string): FieldType | undefined {
		const token = this.peek();
		if (!token) return undefined;

		// Union type
		if (token.value === 'union') {
			return this.parseUnionType(parentId);
		}

		// Array type
		if (token.value === 'array') {
			this.advance();
			this.expect('<');
			const itemType = this.parseType(parentId);
			this.expect('>');
			return {
				display: `${itemType?.display || 'unknown'}[]`,
				isReference: itemType?.isReference || false,
				referencedSchema: itemType?.referencedSchema,
				isArray: true,
				isNullable: false,
				isUnion: false
			};
		}

		// Map type
		if (token.value === 'map') {
			this.advance();
			this.expect('<');
			const valType = this.parseType(parentId);
			this.expect('>');
			return {
				display: `map<${valType?.display || 'unknown'}>`,
				isReference: valType?.isReference || false,
				referencedSchema: valType?.referencedSchema,
				isArray: false,
				isNullable: false,
				isUnion: false
			};
		}

		// Primitive or named type
		this.advance();
		const primitives = new Set(['null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string',
			'date', 'time_ms', 'timestamp_ms', 'decimal', 'uuid']);

		if (primitives.has(token.value)) {
			// Check for nullable shorthand (type?)
			const isNullable = this.peek()?.value === '?';
			if (isNullable) this.advance();

			return {
				display: isNullable ? `${token.value}?` : token.value,
				isReference: false,
				isArray: false,
				isNullable,
				isUnion: false
			};
		}

		// Named type reference
		const refName = token.value;
		const fullName = this.currentNamespace && !refName.includes('.')
			? `${this.currentNamespace}.${refName}`
			: refName;

		const isNullable = this.peek()?.value === '?';
		if (isNullable) this.advance();

		return {
			display: isNullable ? `${refName}?` : refName,
			isReference: true,
			referencedSchema: this.namedTypes.has(fullName) ? fullName : refName,
			isArray: false,
			isNullable,
			isUnion: false
		};
	}

	private parseUnionType(parentId: string): FieldType {
		this.advance(); // 'union'
		this.expect('{');

		const types: FieldType[] = [];
		while (this.pos < this.tokens.length) {
			if (this.peek()?.value === '}') break;

			const t = this.parseType(parentId);
			if (t) types.push(t);

			if (this.peek()?.value === ',') this.advance();
		}

		this.consumeIf('}');

		const isNullable = types.some((t) => t.display === 'null');
		const nonNull = types.filter((t) => t.display !== 'null');

		if (isNullable && nonNull.length === 1) {
			return {
				display: `${nonNull[0].display}?`,
				isReference: nonNull[0].isReference,
				referencedSchema: nonNull[0].referencedSchema,
				isArray: nonNull[0].isArray,
				isNullable: true,
				isUnion: false
			};
		}

		const display = types.map((t) => t.display).join(' | ');
		const refType = nonNull.find((t) => t.isReference);

		return {
			display,
			isReference: !!refType,
			referencedSchema: refType?.referencedSchema,
			isArray: false,
			isNullable,
			isUnion: true,
			unionTypes: types
		};
	}

	private parseEnum(parentId: string | undefined): void {
		this.advance(); // 'enum'
		const nameToken = this.advance();
		if (!nameToken) return;

		const name = nameToken.value;
		const namespace = this.currentNamespace;
		const id = namespace ? `${namespace}.${name}` : name;

		const symbols: string[] = [];

		this.expect('{');
		while (this.pos < this.tokens.length) {
			const token = this.peek();
			if (!token || token.value === '}') break;
			if (token.type === 'ident' || token.type === 'keyword') {
				symbols.push(token.value);
			}
			this.advance();
			if (this.peek()?.value === ',') this.advance();
		}
		this.consumeIf('}');

		const entity: SchemaEntity = {
			id,
			name,
			namespace,
			type: 'enum',
			symbols,
			isNested: parentId !== undefined,
			parentSchema: parentId
		};
		this.namedTypes.set(id, entity);
		this.schemas.push(entity);

		if (parentId) {
			this.relationships.push({
				id: `nested-${parentId}-${id}`,
				sourceSchema: parentId,
				sourceField: name,
				targetSchema: id,
				type: 'nested',
				label: 'contains'
			});
		}
	}

	private parseFixed(parentId: string | undefined): void {
		this.advance(); // 'fixed'
		const nameToken = this.advance();
		if (!nameToken) return;

		const name = nameToken.value;
		const namespace = this.currentNamespace;
		const id = namespace ? `${namespace}.${name}` : name;

		this.expect('(');
		const sizeToken = this.advance();
		const size = sizeToken ? parseInt(sizeToken.value, 10) : 0;
		this.expect(')');
		this.consumeIf(';');

		const entity: SchemaEntity = {
			id,
			name,
			namespace,
			type: 'fixed',
			size,
			isNested: parentId !== undefined,
			parentSchema: parentId
		};
		this.namedTypes.set(id, entity);
		this.schemas.push(entity);
	}

	private peek(): Token | undefined {
		return this.tokens[this.pos];
	}

	private advance(): Token | undefined {
		return this.tokens[this.pos++];
	}

	private expect(value: string): void {
		const token = this.advance();
		if (!token || token.value !== value) {
			this.errors.push(`Expected '${value}' but got '${token?.value || 'EOF'}' at position ${token?.pos || 'end'}`);
		}
	}

	private consumeIf(value: string): boolean {
		if (this.peek()?.value === value) {
			this.advance();
			return true;
		}
		return false;
	}
}
