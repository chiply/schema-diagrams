export interface SchemaError {
	message: string;
	severity: 'error' | 'warning';
	startLineNumber?: number;
	startColumn?: number;
	endLineNumber?: number;
	endColumn?: number;
}

export interface SchemaGraph {
	schemas: SchemaEntity[];
	relationships: Relationship[];
	errors: SchemaError[];
}

export interface SchemaEntity {
	id: string;
	name: string;
	namespace?: string;
	type: 'record' | 'enum' | 'fixed';
	doc?: string;
	fields?: SchemaField[];
	symbols?: string[];
	size?: number;
	isNested: boolean;
	parentSchema?: string;
}

export interface SchemaField {
	name: string;
	type: FieldType;
	doc?: string;
	default?: unknown;
	annotations?: Record<string, unknown>;
}

export interface FieldType {
	display: string;
	isReference: boolean;
	referencedSchema?: string;
	isArray: boolean;
	isNullable: boolean;
	isUnion: boolean;
	unionTypes?: FieldType[];
}

export interface Relationship {
	id: string;
	sourceSchema: string;
	sourceField: string;
	targetSchema: string;
	targetField?: string;
	type: 'reference' | 'nested' | 'join';
	label?: string;
	cardinality?: '1:1' | '1:N' | 'N:1' | 'N:M';
}
