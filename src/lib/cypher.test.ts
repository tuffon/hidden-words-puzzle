import { encode, decode } from './cypher'

describe('cypher', () => {
  const words = [
    'heart',
    'sight',
    'image',
    'heartsightimage', // concatenated guesses, as the share link encodes them
    'abcdefghijklmnopqrstuvwxyz',
  ]
  const seeds = [1, 2, 7, 42]

  test('decode(seed, encode(seed, word)) round-trips to the original', () => {
    for (const seed of seeds) {
      for (const word of words) {
        expect(decode(seed, encode(seed, word))).toBe(word)
      }
    }
  })

  test('encode is deterministic for a fixed seed and word', () => {
    expect(encode(1, 'heart')).toBe(encode(1, 'heart'))
  })

  test('encode disguises the input (output differs from the plaintext)', () => {
    // Not a security property — just confirming it actually transforms.
    expect(encode(1, 'heart')).not.toBe('heart')
  })
})
