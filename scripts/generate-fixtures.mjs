import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
// Golden fixtures are derived from the original Jinja, never from the new TypeScript model.
writeFileSync('reference/model-fixtures.json', execFileSync('python3', ['scripts/jinja-fixtures.py']));
