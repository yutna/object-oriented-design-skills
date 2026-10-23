import test from 'node:test'
import assert from 'node:assert/strict'

import { Terms } from '../../../scripts/lib/routing/terms.mjs'

test('Terms drops stop words', () => {
  assert.deepEqual(
    Terms.of('Use when the clinic is open').words,
    ['clinic', 'open'])
})

test('Terms strips suffixes', () => {
  assert.deepEqual(
    Terms.of('assigning responsibilities scheduled slots').words,
    ['assign', 'responsibility', 'schedul', 'slot'])
})

test('Terms splits on anything that is not a letter or digit', () => {
  assert.deepEqual(
    Terms.of('Object-oriented, 24/7').words,
    ['object', 'orient', '24', '7'])
})

test('Terms keeps a word rather than stemming below three letters', () => {
  assert.deepEqual(Terms.of('ied').words, ['ied'])
})

test('Terms folds create, creates and created to one term', () => {
  assert.deepEqual(
    Terms.of('create creates created').words,
    ['creat', 'creat', 'creat'])
})
