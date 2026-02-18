export function posToLineCol(source: string, pos: number): { line: number; col: number } {
	let line = 1;
	let col = 1;
	for (let i = 0; i < pos && i < source.length; i++) {
		if (source[i] === '\n') {
			line++;
			col = 1;
		} else {
			col++;
		}
	}
	return { line, col };
}
