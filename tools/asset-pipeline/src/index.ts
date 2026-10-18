/**
 * Asset pipeline entry point. Phase 0 only validates the arguments and the
 * legacy directory layout; the converters arrive in phase 1.
 */
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    legacy: { type: 'string' },
    out: { type: 'string' },
  },
});

if (!values.legacy || !values.out) {
  console.error('usage: asset-pipeline --legacy <dir> --out <dir>');
  process.exit(2);
}
for (const sub of ['graphics', 'fonts', 'levels', 'sounds']) {
  if (!existsSync(`${values.legacy}/${sub}`)) {
    console.error(`legacy directory is missing ${sub}/: ${values.legacy}`);
    process.exit(1);
  }
}
console.log(
  `asset-pipeline: legacy=${values.legacy} out=${values.out} (converters not implemented yet)`,
);
