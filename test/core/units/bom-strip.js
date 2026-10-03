'use strict'

const { it } = require('node:test')

const assert = require('assert')
const yaml = require('js-yaml')

it('BOM strip', function () {
  assert.deepStrictEqual(yaml.load('\uFEFFfoo: bar\n'), { foo: 'bar' })
  assert.deepStrictEqual(yaml.load('foo: bar\n'), { foo: 'bar' })
})

it('BOM is allowed before each document in a stream', function () {
  // BOM belongs to the document prefix, not to the content (YAML 1.2, 5.2)
  assert.deepStrictEqual(yaml.loadAll('a: 1\n\uFEFF---\nb: 2\n'), [{ a: 1 }, { b: 2 }])
  assert.deepStrictEqual(yaml.loadAll('---\na: 1\n...\n\uFEFF---\nb: 2\n'), [{ a: 1 }, { b: 2 }])
  assert.deepStrictEqual(yaml.loadAll('a: 1\n\uFEFF...\n\uFEFF---\nb: 2\n'), [{ a: 1 }, { b: 2 }])
  assert.deepStrictEqual(yaml.loadAll('- a\n\uFEFF---\n- b\n'), [['a'], ['b']])
})

it('BOM handling is consistent between load and loadAll', function () {
  assert.deepStrictEqual(yaml.load('\uFEFFa: 1\n...\n'), { a: 1 })

  assert.throws(function () {
    yaml.load('a: 1\n\uFEFF---\nb: 2\n')
  }, /^YAMLException: expected a single document in the stream, but found more$/)
})

it('BOM inside document content is left as is', function () {
  assert.deepStrictEqual(yaml.load('a: "x\uFEFFy"\n'), { a: 'x\uFEFFy' })
  assert.deepStrictEqual(yaml.load('a: x\uFEFFy\n'), { a: 'x\uFEFFy' })
  assert.deepStrictEqual(yaml.load('a: |\n  \uFEFFx\n'), { a: '\uFEFFx\n' })
})

it('error positions are not shifted by a BOM in the stream', function () {
  const input = 'a: 1\n\uFEFF---\nb: 1\nb: 2\n'

  try {
    yaml.loadAll(input)
    assert.fail('should throw')
  } catch (err) {
    assert.strictEqual(err.reason, 'duplicated mapping key')
    assert.strictEqual(err.mark.line, 3)
    assert.strictEqual(err.mark.column, 0)
    assert.strictEqual(err.mark.position, 15)
    assert.strictEqual(err.mark.buffer, input)
  }
})
