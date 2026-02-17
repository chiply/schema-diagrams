import ELK from 'elkjs/lib/elk.bundled.js';
import type { SchemaGraph, SchemaEntity, Relationship } from '../parser/types.ts';
import type { Node, Edge } from '@xyflow/svelte';

const elk = new ELK();

const FIELD_HEIGHT = 28;
const HEADER_HEIGHT = 40;
const NODE_WIDTH = 280;
const SYMBOL_HEIGHT = 24;
const PADDING_BOTTOM = 12;

export interface LayoutResult {
	nodes: Node[];
	edges: Edge[];
}

export async function layoutGraph(
	graph: SchemaGraph,
	collapsedNodes: Set<string>
): Promise<LayoutResult> {
	const elkNodes = graph.schemas.map((schema) => {
		const height = computeNodeHeight(schema, collapsedNodes.has(schema.id));
		const ports = buildPorts(schema, collapsedNodes.has(schema.id));
		return {
			id: schema.id,
			width: NODE_WIDTH,
			height,
			ports,
			properties: {
				'org.eclipse.elk.portConstraints': 'FIXED_ORDER'
			}
		};
	});

	const elkEdges = graph.relationships.map((rel) => ({
		id: rel.id,
		sources: [rel.sourceField ? `${rel.sourceSchema}.${rel.sourceField}-source` : rel.sourceSchema],
		targets: [rel.targetField ? `${rel.targetSchema}.${rel.targetField}-target` : `${rel.targetSchema}-target`]
	}));

	const elkGraph = {
		id: 'root',
		layoutOptions: {
			'elk.algorithm': 'layered',
			'elk.direction': 'RIGHT',
			'elk.spacing.nodeNode': '60',
			'elk.layered.spacing.nodeNodeBetweenLayers': '80',
			'elk.spacing.edgeNode': '30',
			'elk.spacing.edgeEdge': '20',
			'elk.layered.mergeEdges': 'true',
			'elk.edgeRouting': 'ORTHOGONAL',
			'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
		},
		children: elkNodes,
		edges: elkEdges
	};

	const layout = await elk.layout(elkGraph);

	const nodes: Node[] = graph.schemas.map((schema) => {
		const elkNode = layout.children?.find((n) => n.id === schema.id);
		const isCollapsed = collapsedNodes.has(schema.id);

		let nodeType: string;
		if (schema.type === 'enum') nodeType = 'enum';
		else if (schema.type === 'fixed') nodeType = 'enum'; // reuse enum styling for fixed
		else nodeType = 'schemaEntity';

		return {
			id: schema.id,
			type: nodeType,
			position: {
				x: elkNode?.x ?? 0,
				y: elkNode?.y ?? 0
			},
			data: {
				schema,
				isCollapsed
			}
		};
	});

	const edges: Edge[] = graph.relationships.map((rel) => ({
		id: rel.id,
		source: rel.sourceSchema,
		sourceHandle: rel.sourceField ? `${rel.sourceSchema}.${rel.sourceField}-source` : undefined,
		target: rel.targetSchema,
		targetHandle: rel.targetField ? `${rel.targetSchema}.${rel.targetField}-target` : rel.targetSchema + '-target',
		type: 'relationship',
		data: {
			relationship: rel
		}
	}));

	return { nodes, edges };
}

function computeNodeHeight(schema: SchemaEntity, isCollapsed: boolean): number {
	if (isCollapsed) {
		return HEADER_HEIGHT + PADDING_BOTTOM;
	}

	if (schema.type === 'record' && schema.fields) {
		return HEADER_HEIGHT + schema.fields.length * FIELD_HEIGHT + PADDING_BOTTOM;
	}

	if (schema.type === 'enum' && schema.symbols) {
		return HEADER_HEIGHT + Math.min(schema.symbols.length, 8) * SYMBOL_HEIGHT + PADDING_BOTTOM;
	}

	if (schema.type === 'fixed') {
		return HEADER_HEIGHT + SYMBOL_HEIGHT + PADDING_BOTTOM;
	}

	return HEADER_HEIGHT + PADDING_BOTTOM;
}

function buildPorts(schema: SchemaEntity, isCollapsed: boolean) {
	const ports: { id: string; properties: Record<string, string>; width: number; height: number }[] = [];

	// Target handle for the node itself
	ports.push({
		id: `${schema.id}-target`,
		properties: { 'org.eclipse.elk.port.side': 'WEST' },
		width: 8,
		height: 8
	});

	if (schema.type === 'record' && schema.fields && !isCollapsed) {
		schema.fields.forEach((field, i) => {
			ports.push({
				id: `${schema.id}.${field.name}-source`,
				properties: { 'org.eclipse.elk.port.side': 'EAST' },
				width: 8,
				height: 8
			});
			ports.push({
				id: `${schema.id}.${field.name}-target`,
				properties: { 'org.eclipse.elk.port.side': 'WEST' },
				width: 8,
				height: 8
			});
		});
	}

	return ports;
}
