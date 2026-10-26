import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const checker = fileURLToPath(new URL('./check-internal-links.mjs', import.meta.url));

function runFixture(stylesheet, html = '<!doctype html><main id="start"><link href="/assets/site.css" rel="stylesheet"><a href="#start">top</a></main>') {
 const directory = mkdtempSync(join(tmpdir(), 'ejoeun-static-links-'));
 try {
  const dist = join(directory, 'dist');
  mkdirSync(join(dist, 'assets'), {recursive: true});
  mkdirSync(join(dist, 'themes'), {recursive: true});
  writeFileSync(join(dist, 'index.html'), html);
  writeFileSync(join(dist, 'assets', 'site.css'), stylesheet);
  writeFileSync(join(dist, 'assets', 'painting.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  writeFileSync(join(dist, 'assets', 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  writeFileSync(join(dist, 'themes', 'print.css'), '@media print { body {color: black} }');
  return spawnSync(process.execPath, [checker], {cwd: directory, encoding: 'utf8', timeout: 10_000});
 } finally {
  rmSync(directory, {recursive: true, force: true});
 }
}

test('checks working CSS backgrounds, queries, relative images and local @import without network access', () => {
 const css = [
  'main {background:url("/assets/painting.svg?v=2026#paint") center/cover;}',
  'a {mask-image:url(./icon.svg);}',
  '@import "../themes/print.css";',
  'p {background:url(data:image/svg+xml,%3Csvg%3E%3C/svg%3E);}',
  'p {background-image:url(https://example.org/public/photo.png);}',
  '/* .old {background:url(/assets/removed-old-photo.jpg)} */'
 ].join('\n');
 const outcome = runFixture(css);
 assert.equal(outcome.status, 0, outcome.stderr);
 assert.match(outcome.stdout, /CSS asset references/);
 assert.match(outcome.stdout, /stylesheets/);
});

test('rejects missing CSS hero artwork even when its HTML stylesheet exists', () => {
 const outcome = runFixture('.hero{background-image:url("/assets/missing-monet.webp")}');
 assert.notEqual(outcome.status, 0, 'missing CSS background must fail the production build gate');
 assert.match(outcome.stderr, /Missing local CSS image\/font\/import/);
 assert.match(outcome.stderr, /\/assets\/missing-monet\.webp/);
});

test('rejects missing CSS @import from a nested stylesheet path', () => {
 const outcome = runFixture('@import "../themes/not-published.css";');
 assert.notEqual(outcome.status, 0);
 assert.match(outcome.stderr, /\/themes\/not-published\.css/);
});

test('still validates same-page heading links as before', () => {
 const outcome = runFixture('body{color:black}', '<!doctype html><main id="start"><a href="#missing-heading">target</a></main>');
 assert.notEqual(outcome.status, 0);
 assert.match(outcome.stderr, /Missing HTML anchor #missing-heading/);
});
