import test from 'node:test'
import assert from 'node:assert/strict'

import { Report } from '../../scripts/lib/report.mjs'

test('Report lists every error before the error summary', () => {
  const report = new Report()
  report.error('scripts/a.mjs:1', 'first')
  report.error('scripts/b.mjs', 'second')
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error scripts/a.mjs:1: first',
    'error scripts/b.mjs: second',
    'failed: 2 error(s)'
  ])
})

test('Report keeps every count in order', () => {
  const report = new Report()
  report.count('file(s)', 3)
  report.count('class(es)', 12)
  report.count('file(s)', 4)
  assert.equal(report.failed, false)
  assert.deepEqual(report.lines(), [
    'ok 3 file(s), 12 class(es), 4 file(s)'
  ])
})

test('Report fails with no counts at all', () => {
  const report = new Report()
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), ['failed: measured nothing'])
})

test('Report fails on a zero count', () => {
  const report = new Report()
  report.count('file(s)', 0)
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'failed: measured nothing (0 file(s))'
  ])
})

test('a later count cannot hide an earlier zero', () => {
  const report = new Report()
  report.count('file(s)', 0)
  report.count('file(s)', 3)
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'failed: measured nothing (0 file(s))'
  ])
})

test('Report prints a note after errors and before the summary', () => {
  const report = new Report()
  report.error('a', 'bad')
  report.note('labels: Rule 50% (1), Default 50% (1)')
  report.count('rule(s)', 2)
  assert.equal(report.failed, true)
  assert.deepEqual(report.lines(), [
    'error a: bad',
    'labels: Rule 50% (1), Default 50% (1)',
    'failed: 1 error(s)'
  ])
})

test('Report note never changes failed', () => {
  const report = new Report()
  report.count('file(s)', 1)
  report.note('exact text')
  assert.equal(report.failed, false)
  assert.deepEqual(report.lines(), [
    'exact text',
    'ok 1 file(s)'
  ])
})
