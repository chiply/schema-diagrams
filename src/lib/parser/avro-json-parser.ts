import type { SchemaGraph, SchemaEntity, SchemaField, FieldType, Relationship } from './types.ts';

type AvroSchema = Record<string, unknown>;

export function parseAvroJson(input: string): SchemaGraph {
	const schemas: SchemaEntity[] = [];
	const relationships: Relationship[] = [];
	const errors: string[] = [];
	const namedTypes = new Map<string, SchemaEntity>();

	try {
		const parsed = JSON.parse(input);
		const topLevel = Array.isArray(parsed) ? parsed : [parsed];

		for (const schema of topLevel) {
			processSchema(schema, undefined, schemas, relationships, namedTypes, errors);
		}
	} catch (e) {
		errors.push(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
	}

	return { schemas, relationships, errors };
}

function processSchema(
	schema: AvroSchema,
	parentId: string | undefined,
	schemas: SchemaEntity[],
	relationships: Relationship[],
	namedTypes: Map<string, SchemaEntity>,
	errors: string[]
): string | undefined {
	if (typeof schema !== 'object' || schema === null) return undefined;

	const type = schema.type as string;
	if (!type) return undefined;

	const name = schema.name as string;
	if (!name) return undefined;

	const namespace = (schema.namespace as string) || extractNamespace(parentId);
	const id = namespace ? `${namespace}.${name}` : name;

	if (namedTypes.has(id)) return id;

	if (type === 'record') {
		const entity: SchemaEntity = {
			id,
			name,
			namespace: namespace || undefined,
			type: 'record',
			doc: schema.doc as string | undefined,
			fields: [],
			isNested: parentId !== undefined,
			parentSchema: parentId
		};
		namedTypes.set(id, entity);
		schemas.push(entity);

		const fields = schema.fields as AvroSchema[] | undefined;
		if (Array.isArray(fields)) {
			for (const field of fields) {
				const schemaField = processField(field, id, schemas, relationships, namedTypes, errors);
				if (schemaField) {
					entity.fields!.push(schemaField);
				}
			}
		}

		return id;
	}

	if (type === 'enum') {
		const entity: SchemaEntity = {
			id,
			name,
			namespace: namespace || undefined,
			type: 'enum',
			doc: schema.doc as string | undefined,
			symbols: schema.symbols as string[] | undefined,
			isNested: parentId !== undefined,
			parentSchema: parentId
		};
		namedTypes.set(id, entity);
		schemas.push(entity);

		return id;
	}

	if (type === 'fixed') {
		const entity: SchemaEntity = {
			id,
			name,
			namespace: namespace || undefined,
			type: 'fixed',
			doc: schema.doc as string | undefined,
			size: schema.size as number | undefined,
			isNested: parentId !== undefined,
			parentSchema: parentId
		};
		namedTypes.set(id, entity);
		schemas.push(entity);
		return id;
	}

	return undefined;
}

function processField(
	field: AvroSchema,
	parentId: string,
	schemas: SchemaEntity[],
	relationships: Relationship[],
	namedTypes: Map<string, SchemaEntity>,
	errors: string[]
): SchemaField | undefined {
	const name = field.name as string;
	if (!name) return undefined;

	const fieldType = resolveType(field.type, name, parentId, schemas, relationships, namedTypes, errors);

	// Check for join annotations
	const join = field.join as AvroSchema | undefined;
	if (join && typeof join === 'object') {
		const targetSchema = join.schema as string;
		const targetField = join.field as string | undefined;
		const cardinality = join.cardinality as string | undefined;
		if (targetSchema) {
			relationships.push({
				id: `join-${parentId}.${name}-${targetSchema}`,
				sourceSchema: parentId,
				sourceField: name,
				targetSchema,
				targetField,
				type: 'join',
				label: targetField ? `${name} → ${targetField}` : undefined,
				cardinality: (cardinality as Relationship['cardinality']) || undefined
			});
		}
	}

	// Collect annotations (any non-standard field-level keys)
	const standardKeys = new Set(['name', 'type', 'doc', 'default', 'order', 'aliases', 'join']);
	const annotations: Record<string, unknown> = {};
	for (const key of Object.keys(field)) {
		if (!standardKeys.has(key)) {
			annotations[key] = field[key];
		}
	}

	return {
		name,
		type: fieldType,
		doc: field.doc as string | undefined,
		default: field.default,
		annotations: Object.keys(annotations).length > 0 ? annotations : undefined
	};
}

function resolveType(
	type: unknown,
	fieldName: string,
	parentId: string,
	schemas: SchemaEntity[],
	relationships: Relationship[],
	namedTypes: Map<string, SchemaEntity>,
	errors: string[]
): FieldType {
	// String type reference
	if (typeof type === 'string') {
		return resolveStringType(type, fieldName, parentId, relationships, namedTypes);
	}

	// Array = union
	if (Array.isArray(type)) {
		return resolveUnionType(type, fieldName, parentId, schemas, relationships, namedTypes, errors);
	}

	// Object = complex type
	if (typeof type === 'object' && type !== null) {
		const obj = type as AvroSchema;
		const objType = obj.type as string;

		// Array type
		if (objType === 'array') {
			const items = obj.items;
			const itemType = resolveType(items, fieldName, parentId, schemas, relationships, namedTypes, errors);
			if (itemType.isReference && itemType.referencedSchema) {
				relationships.push({
					id: `ref-${parentId}.${fieldName}-${itemType.referencedSchema}`,
					sourceSchema: parentId,
					sourceField: fieldName,
					targetSchema: itemType.referencedSchema,
					type: 'reference',
					cardinality: '1:N'
				});
			}
			return {
				display: `${itemType.display}[]`,
				isReference: itemType.isReference,
				referencedSchema: itemType.referencedSchema,
				isArray: true,
				isNullable: false,
				isUnion: false
			};
		}

		// Map type
		if (objType === 'map') {
			const values = obj.values;
			const valType = resolveType(values, fieldName, parentId, schemas, relationships, namedTypes, errors);
			return {
				display: `map<${valType.display}>`,
				isReference: valType.isReference,
				referencedSchema: valType.referencedSchema,
				isArray: false,
				isNullable: false,
				isUnion: false
			};
		}

		// Inline named type (record, enum, fixed)
		if (objType === 'record' || objType === 'enum' || objType === 'fixed') {
			const inlineId = processSchema(obj, parentId, schemas, relationships, namedTypes, errors);
			if (inlineId) {
				if (parentId) {
					relationships.push({
						id: `nested-${parentId}-${inlineId}`,
						sourceSchema: parentId,
						sourceField: fieldName,
						targetSchema: inlineId,
						type: 'nested',
						label: 'contains'
					});
				}
				return {
					display: (obj.name as string) || objType,
					isReference: true,
					referencedSchema: inlineId,
					isArray: false,
					isNullable: false,
					isUnion: false
				};
			}
		}
	}

	return {
		display: String(type),
		isReference: false,
		isArray: false,
		isNullable: false,
		isUnion: false
	};
}

function resolveStringType(
	type: string,
	fieldName: string,
	parentId: string,
	relationships: Relationship[],
	namedTypes: Map<string, SchemaEntity>
): FieldType {
	const primitives = new Set(['null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string']);

	if (primitives.has(type)) {
		return {
			display: type,
			isReference: false,
			isArray: false,
			isNullable: type === 'null',
			isUnion: false
		};
	}

	// Named type reference
	const isKnown = namedTypes.has(type);
	if (isKnown) {
		relationships.push({
			id: `ref-${parentId}.${fieldName}-${type}`,
			sourceSchema: parentId,
			sourceField: fieldName,
			targetSchema: type,
			type: 'reference',
			cardinality: '1:1'
		});
	}

	return {
		display: type.includes('.') ? type.split('.').pop()! : type,
		isReference: true,
		referencedSchema: type,
		isArray: false,
		isNullable: false,
		isUnion: false
	};
}

function resolveUnionType(
	types: unknown[],
	fieldName: string,
	parentId: string,
	schemas: SchemaEntity[],
	relationships: Relationship[],
	namedTypes: Map<string, SchemaEntity>,
	errors: string[]
): FieldType {
	const resolved = types.map((t) =>
		resolveType(t, fieldName, parentId, schemas, relationships, namedTypes, errors)
	);

	const isNullable = resolved.some((t) => t.display === 'null');
	const nonNull = resolved.filter((t) => t.display !== 'null');

	// Simple nullable: ["null", "SomeType"]
	if (isNullable && nonNull.length === 1) {
		const inner = nonNull[0];
		return {
			display: `${inner.display}?`,
			isReference: inner.isReference,
			referencedSchema: inner.referencedSchema,
			isArray: inner.isArray,
			isNullable: true,
			isUnion: false
		};
	}

	// Complex union
	const display = resolved.map((t) => t.display).join(' | ');
	const refType = nonNull.find((t) => t.isReference);

	return {
		display,
		isReference: !!refType,
		referencedSchema: refType?.referencedSchema,
		isArray: false,
		isNullable,
		isUnion: true,
		unionTypes: resolved
	};
}

function extractNamespace(parentId: string | undefined): string | undefined {
	if (!parentId) return undefined;
	const lastDot = parentId.lastIndexOf('.');
	return lastDot >= 0 ? parentId.substring(0, lastDot) : undefined;
}
