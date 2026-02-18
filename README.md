# Schema Diagrams

A web-based tool for visualizing Apache Avro schemas as interactive entity-relationship diagrams. Write or paste Avro schema definitions and see them rendered as a live, interactive diagram.

## Features

- **Dual Format Support**: Parse both Avro JSON and Avro IDL with automatic format detection
- **Bidirectional Editing**: Edit via code OR visually on the diagram - changes sync both ways
- **Real-time Preview**: See diagram updates instantly as you edit
- **Interactive Diagrams**: Pan, zoom, collapse/expand records, and explore your schema
- **Inline Validation**: Monaco editor shows squiggly underlines and error markers for schema errors
- **Automatic Layout**: ELK graph layout engine arranges nodes automatically
- **Join Relationships**: Define relationships between schemas using `@join` annotations (IDL) or `"x.join"` metadata (JSON)
- **Dark/Light Theme**: Toggle between themes with persistence

## Visual Editing

The diagram supports visual editing that updates the schema code:

| Action | How |
|--------|-----|
| **Edit field name** | Click on a field name in a record node |
| **Edit field type** | Click on a field type to get a dropdown |
| **Edit default value** | Click on a default value in a field row |
| **Add/rename enum symbols** | Click on enum symbols in enum nodes |
| **Collapse/expand** | Click the collapse toggle on record nodes |

All visual changes are immediately reflected in the schema code.

## Schema Formats

### Avro JSON

```json
[
  {
    "type": "record",
    "name": "User",
    "namespace": "com.example",
    "fields": [
      { "name": "id", "type": "long" },
      { "name": "name", "type": "string" },
      { "name": "email", "type": ["null", "string"], "default": null }
    ]
  }
]
```

### Avro IDL

```
protocol Example {
  record User {
    long id;
    string name;
    union { null, string } email = null;
  }
}
```

### Join Relationships

Define relationships between schemas to render connecting edges:

**Avro IDL** (using annotations):
```
record Order {
  long id;
  @join({"schema": "com.shop.User", "field": "id", "cardinality": "N:1"})
  long user_id;
}
```

**Avro JSON** (using custom metadata):
```json
{
  "name": "user_id",
  "type": "long",
  "x.join": { "schema": "com.shop.User", "field": "id", "cardinality": "N:1" }
}
```

Supported cardinalities: `1:1`, `1:N`, `N:1`, `N:N`

## Getting Started

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open http://localhost:5173 in your browser.

## Technology Stack

- **Svelte 5** - Frontend framework with runes
- **Svelte Flow** (@xyflow/svelte) - Node/edge diagram canvas
- **ELK** (elkjs) - Automatic graph layout engine
- **Monaco Editor** - VS Code editor with inline validation
- **TypeScript** - Type safety

## Building

```sh
npm run build
npm run preview
```

## Limitations

While Schema Diagrams is useful for many scenarios, it may not be the right choice if:

### You Need Non-Avro Schema Support
- Currently only supports Apache Avro schemas (JSON and IDL formats)
- Not suitable for JSON Schema, Protobuf, Thrift, or other schema languages

### You Need Advanced Diagram Features
- **Custom styling**: Limited customization of colors, fonts, and visual styles
- **Export options**: Limited export formats (no PDF, PNG, or SVG export yet)
- **Behavioral diagrams**: This tool focuses on entity-relationship diagrams, not sequence or timing diagrams

### You Work With Non-Technical Teams
- **No standalone editor**: Requires running a development server (not a simple desktop app)
- **Technical setup**: Requires Node.js installation and familiarity with npm/web development

### You Have Large-Scale Schemas
- **Performance**: Browser-based rendering may struggle with very large schemas containing hundreds of types
- **Memory constraints**: Monaco Editor and the diagram canvas both consume significant memory

### You Need a Mature, Stable Project
- **Version 0.0.1**: This is an early-stage project that may have bugs and breaking changes
- **Limited community**: Small user base means fewer resources, examples, and community support

## When Schema Diagrams is Right For You

Consider Schema Diagrams if you:
- Work with Apache Avro schemas and want to visualize record relationships
- Want a quick way to understand complex schema hierarchies
- Prefer bidirectional code and visual editing
- Need inline schema validation with helpful error markers
- Want to explore schemas interactively with collapse/expand and zoom
