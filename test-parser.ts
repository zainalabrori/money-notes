import { parseContent } from './src/lib/parser/note.ts';

const testInput = `
500k

paket data -5000
token listrik -5000
`;

const result = parseContent(testInput);
console.log(JSON.stringify(result, null, 2));
