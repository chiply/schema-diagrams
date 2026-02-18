# Contributing to Schema Diagrams

Thanks for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```sh
   git clone https://github.com/YOUR_USERNAME/schema-diagrams.git
   cd schema-diagrams
   ```
3. Install dependencies:
   ```sh
   npm install
   ```
4. Start the development server:
   ```sh
   npm run dev
   ```

## Development Workflow

1. Create a feature branch from `main`:
   ```sh
   git checkout -b your-feature-name
   ```
2. Make your changes
3. Verify the build succeeds:
   ```sh
   npm run build
   ```
4. Run type checking:
   ```sh
   npm run check
   ```
5. Commit your changes and push to your fork
6. Open a pull request against `main`

## Project Structure

```
src/
  lib/
    parser/           # Schema parsing (Avro JSON + Avro IDL)
      avro-json-parser.ts
      avro-idl-parser.ts
      format-detector.ts
      types.ts
    layout/           # ELK graph layout
    components/       # Svelte diagram components (nodes, edges)
    examples.ts       # Built-in example schemas
    theme.svelte.ts   # Theme state management
  routes/
    +page.svelte      # Main application page
```

## Guidelines

- **TypeScript**: All code should be written in TypeScript
- **Formatting**: Follow the existing code style in the project
- **Commits**: Write clear, concise commit messages that describe the "why" not just the "what"
- **Scope**: Keep pull requests focused on a single change; avoid unrelated modifications

## Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub with:
- A clear description of the problem or feature
- Steps to reproduce (for bugs)
- Expected vs actual behavior (for bugs)
- Schema input that triggers the issue, if applicable
