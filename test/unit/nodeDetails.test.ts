import { PathVisits } from '@jbrowse/bandage-core'
import { expect, test } from '@playwright/test'

import { linkSides, nodeLinks, placedWalks } from '../../src/nodeDetails'

import type { Graph } from '@jbrowse/bandage-core'

const node = (id: string, length: number) => ({
  id,
  name: id,
  length,
  depth: 1,
})

test('linkSides reads a flipped strand as the other end', () => {
  expect(linkSides({ from: 'a', to: 'b' })).toEqual({
    from: 'end',
    to: 'start',
  })
  expect(
    linkSides({ from: 'a', to: 'b', fromStrand: '-', toStrand: '-' }),
  ).toEqual({ from: 'start', to: 'end' })
  expect(
    linkSides({ from: 'a-', to: 'b', fromStrand: '-', toStrand: '+' }),
  ).toEqual({ from: 'end', to: 'start' })
})

test('nodeLinks groups a node’s neighbours by the end they join', () => {
  const graph: Graph = {
    name: 'g',
    nodes: [node('a', 5), node('b', 3), node('c', 4)],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c', fromStrand: '+', toStrand: '-' },
      { from: 'b', to: 'b', fromStrand: '+', toStrand: '+' },
    ],
  }
  expect(nodeLinks(graph, 'b')).toEqual({
    start: [
      { edgeIndex: 0, nodeId: 'a', side: 'end' },
      { edgeIndex: 2, nodeId: 'b', side: 'end' },
    ],
    end: [
      { edgeIndex: 1, nodeId: 'c', side: 'end' },
      { edgeIndex: 2, nodeId: 'b', side: 'start' },
    ],
  })
})

test('nodeLinks reads a node drawn reversed by its drawn ends, and a hairpin once', () => {
  const graph: Graph = {
    name: 'g',
    nodes: [node('3+', 5), node('65-', 3)],
    edges: [
      { from: '3+', to: '65-', fromStrand: '+', toStrand: '-' },
      { from: '3+', to: '65-', fromStrand: '+', toStrand: '-' },
      { from: '65-', to: '65-', fromStrand: '-', toStrand: '+' },
    ],
  }
  expect(nodeLinks(graph, '65-')).toEqual({
    start: [{ edgeIndex: 0, nodeId: '3+', side: 'end' }],
    end: [{ edgeIndex: 2, nodeId: '65-', side: 'end' }],
  })
})

test('placedWalks places a node on each walk’s own contig', () => {
  const graph: Graph = {
    name: 'g',
    nodes: [node('a', 5), node('b', 3), node('c', 4)],
    edges: [],
    paths: [
      {
        name: 'x#1#chr',
        nodeIds: ['a', 'b', 'c', 'b'],
        start: 100,
        end: 115,
        contig: 'chr',
      },
      { name: 'y#1#ctg:10-17', nodeIds: ['c', 'b'], start: 10, end: 17 },
      { name: 'z', nodeIds: ['a', 'c'] },
    ],
  }
  graph.pathVisits = PathVisits.from([
    [
      'b',
      [
        { path: 'x#1#chr', sample: 'x', start: 105, strand: '-' as const },
        { path: 'y#1#ctg', sample: 'y', start: 14, strand: '+' as const },
      ],
    ],
  ])
  const length = (id: string) => graph.nodes.find(n => n.id === id)!.length
  expect(placedWalks(graph, graph.nodes[1]!, length)).toEqual([
    {
      name: 'x#1#chr',
      visits: 2,
      at: { contig: 'chr', start: 105, end: 108 },
      strand: '-',
    },
    {
      name: 'y#1#ctg:10-17',
      visits: 1,
      at: { contig: 'y#1#ctg', start: 14, end: 17 },
      strand: '+',
    },
  ])
})

test('placedWalks lists a walk that reaches a node only through a departure, where its own step lies', () => {
  const graph: Graph = {
    name: 'g',
    nodes: [
      node('a', 5),
      {
        ...node('d', 3),
        depth: 2,
        departureVisits: [
          { path: 'x#1#chr', sample: 'x', start: 200, strand: '-' },
          { path: 'y#1#ctg', sample: 'y', start: 40, strand: '+' },
        ],
      },
    ],
    edges: [],
    paths: [
      { name: 'x#1#chr', nodeIds: ['a'], start: 100, contig: 'chr' },
      { name: 'z#1#chr', nodeIds: ['a'], start: 0, contig: 'chr' },
    ],
  }
  const length = (id: string) => graph.nodes.find(n => n.id === id)!.length
  expect(placedWalks(graph, graph.nodes[1]!, length)).toEqual([
    {
      name: 'x#1#chr',
      visits: 1,
      at: { contig: 'chr', start: 200, end: 203 },
      strand: '-',
    },
    {
      name: 'y#1#ctg',
      visits: 1,
      at: { contig: 'y#1#ctg', start: 40, end: 43 },
      strand: '+',
    },
  ])
})

test('placedWalks places a node on no walk whose record states no start, or a span its own steps do not fill', () => {
  const graph: Graph = {
    name: 'g',
    nodes: [node('a', 5), node('b', 3)],
    edges: [],
    paths: [
      { name: 'x#1#chr', nodeIds: ['a', 'b'], start: 0, contig: 'chr' },
      {
        name: 'y#1#ctg',
        nodeIds: ['a', 'b'],
        start: 0,
        end: 500,
        contig: 'ctg',
      },
      {
        name: 'w#1#chr',
        nodeIds: ['a', 'b'],
        start: 7,
        end: 15,
        contig: 'chr',
      },
    ],
  }
  const length = (id: string) => graph.nodes.find(n => n.id === id)!.length
  expect(
    placedWalks(graph, graph.nodes[1]!, length).map(w => [w.name, w.at]),
  ).toEqual([
    ['x#1#chr', undefined],
    ['y#1#ctg', undefined],
    ['w#1#chr', { contig: 'chr', start: 12, end: 15 }],
  ])
})
