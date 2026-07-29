import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

import { radius, type } from '../src/design/theme';

const ROOT = join(import.meta.dirname, '..');

/**
 * The first-generation calendar feature is unreachable and frozen pending a
 * redesign (see src/design/README.md). Its tokens are migrated but its layout
 * is not, so it keeps a handful of off-scale values. Nothing else may.
 */
const FROZEN = ['src/components/calendar'];

/** Where the scale itself is allowed to be defined. */
const SOURCE_OF_TRUTH = 'src/design/theme.ts';

function sourceFiles() {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        files.push(full);
      }
    }
  };
  walk(join(ROOT, 'app'));
  walk(join(ROOT, 'src'));

  return files
    .map((file) => ({ path: relative(ROOT, file), text: readFileSync(file, 'utf8') }))
    .filter(
      ({ path }) =>
        path !== SOURCE_OF_TRUTH &&
        !FROZEN.some((frozen) => path.startsWith(frozen)),
    );
}

function violations(pattern: RegExp) {
  const found: string[] = [];
  for (const { path, text } of sourceFiles()) {
    text.split('\n').forEach((line, index) => {
      if (pattern.test(line)) found.push(`${path}:${index + 1} ${line.trim()}`);
    });
  }
  return found;
}

test('type styles are only defined in the theme', () => {
  // fontVariant is deliberately allowed — it is not a size.
  const found = violations(
    /\b(fontSize|fontWeight|lineHeight|letterSpacing)\s*:/,
  );
  assert.deepEqual(
    found,
    [],
    `Use a \`type\` token instead of a raw text style:\n${found.join('\n')}`,
  );
});

test('corner radii are only defined in the theme', () => {
  const found = violations(/\bborderRadius\s*:\s*[0-9]/);
  assert.deepEqual(
    found,
    [],
    `Use a \`radius\` token instead of a raw number:\n${found.join('\n')}`,
  );
});

test('cards at the card radius get Apple squircle corners', () => {
  const offenders: string[] = [];
  for (const { path, text } of sourceFiles()) {
    // Style objects are separated by a line containing only `},`.
    for (const block of text.split(/^\s*\},\s*$/m)) {
      if (
        block.includes('borderRadius: radius.md') &&
        !block.includes("borderCurve: 'continuous'")
      ) {
        offenders.push(path);
        break;
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `radius.md must be paired with borderCurve: 'continuous' in:\n${offenders.join('\n')}`,
  );
});

test('the type ramp matches the iOS text styles', () => {
  // Guards against someone "simplifying" the ramp back into a flat scale.
  assert.equal(type.body.fontSize, 17);
  assert.equal(type.headline.fontSize, 17);
  assert.equal(type.footnote.fontSize, 13);
  // Apple's tracking curve is negative through the reading sizes and positive
  // at display sizes. A single blanket value is wrong at both ends.
  assert.ok(type.body.letterSpacing < 0);
  assert.ok(type.title.letterSpacing > 0);
});

test('the radius scale has no duplicate values', () => {
  const values = Object.values(radius);
  assert.equal(new Set(values).size, values.length);
});
