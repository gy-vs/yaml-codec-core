'use strict'

const { it } = require('node:test')

const assert = require('assert')
const yaml = require('js-yaml')

it('BOM strip', function () {
  assert.deepStrictEqual(yaml.load('\uFEFFfoo: bar\n'), { foo: 'bar' })
  assert.deepStrictEqual(yaml.load('foo: bar\n'), { foo: 'bar' })
})

it('BOM before a document separator is a part of the document prefix', function () {
  // BOM before `---` right after a document without an explicit end marker
  assert.deepStrictEqual(yaml.loadAll('a: 1\n\uFEFF---\nb: 2\n'), [{ a: 1 }, { b: 2 }])

  // BOM before `---` after an explicit document end marker
  assert.deepStrictEqual(yaml.loadAll('---\na: 1\n...\n\uFEFF---\nb: 2\n'), [{ a: 1 }, { b: 2 }])

  // BOM at the start of the stream and before every following document
  assert.deepStrictEqual(yaml.loadAll('\uFEFF---\na: 1\n\uFEFF---\nb: 2\n'), [{ a: 1 }, { b: 2 }])

  // BOM before the document end marker
  assert.deepStrictEqual(yaml.loadAll('a: 1\n\uFEFF...\n---\nb: 2\n'), [{ a: 1 }, { b: 2 }])

  // CRLF line endings
  assert.deepStrictEqual(yaml.loadAll('a: 1\r\n\uFEFF---\r\nb: 2\r\n'), [{ a: 1 }, { b: 2 }])

  // scalar and sequence documents
  assert.deepStrictEqual(yaml.loadAll('a\n\uFEFF---\nb\n'), ['a', 'b'])
  assert.deepStrictEqual(yaml.loadAll('- a\n\uFEFF---\n- b\n'), [['a'], ['b']])
})

it('load() handles BOM before a document separator like loadAll()', function () {
  // a single document is returned as is
  assert.deepStrictEqual(yaml.load('\uFEFF---\na: 1\n...\n'), { a: 1 })

  // multiple documents are still an error
  assert.throws(function () {
    yaml.load('a: 1\n\uFEFF---\nb: 2\n')
  }, function (e) {
    return e instanceof yaml.YAMLException &&
           e.message === 'expected a single document in the stream, but found more'
  })
})

it('BOM inside document content is left untouched', function () {
  // in the middle of a line
  assert.deepStrictEqual(yaml.load('key: \uFEFFvalue\n'), { key: '\uFEFFvalue' })

  // inside a block scalar
  assert.deepStrictEqual(yaml.load('key: |\n  \uFEFFtext\n'), { key: '\uFEFFtext\n' })

  // inside a quoted scalar, even right before `---` at a line start
  assert.deepStrictEqual(yaml.load("'a\n\uFEFF---\nb'\n"), 'a \uFEFF--- b')

  // not followed by a document separator
  assert.deepStrictEqual(yaml.loadAll('a: 1\n...\n\uFEFFb: 2\n'), [{ a: 1 }, { '\uFEFFb': 2 }])
  assert.deepStrictEqual(yaml.load('x: 1\n\uFEFF---: 2\n'), { x: 1, '\uFEFF---': 2 })
})

it('BOM in the document prefix does not shift error positions', function () {
  const input = 'a: 1\n\uFEFF---\nb: 1\nb: 2\n'

  assert.throws(function () {
    yaml.loadAll(input)
  }, function (e) {
    return e instanceof yaml.YAMLException &&
           e.reason === 'duplicated mapping key' &&
           e.mark.line === 3 &&
           e.mark.column === 0 &&
           e.mark.position === input.indexOf('b: 2')
  })
})
