import { expect, test } from '@playwright/test'

import {
  clearInteraction,
  cutsWholeWalks,
  keyMovesFit,
  layoutFit,
  settings,
  state,
} from '../../src/state'

test('a graph opened or a bubble popped selects neither a node nor a row', () => {
  state.selectedNode = 'n1'
  state.selectedRow = 'HG00097#1#chr6'
  clearInteraction()
  expect(state.selectedNode).toBeNull()
  expect(state.selectedRow).toBeNull()
})

test('a gbz cut follows whole walks for walk rows, as the layout or under it', () => {
  const was = { ...settings }
  settings.mode = 'force'
  settings.walkStrip = false
  expect(cutsWholeWalks()).toBe(false)
  settings.walkStrip = true
  expect(cutsWholeWalks()).toBe(true)
  settings.walkStrip = false
  settings.mode = 'walkrows'
  expect(cutsWholeWalks()).toBe(true)
  // The strip draws nothing under a tube map, but the answer holds there: a
  // cut that follows the snarls comes back the same graph, and keeping the
  // answer steady is what saves re-fetching the window on the way back to a
  // layout that does draw the strip.
  settings.mode = 'tubemap'
  settings.walkStrip = true
  expect(cutsWholeWalks()).toBe(true)
  Object.assign(settings, was)
})

test('the fit and a force layout take the pane less the key column', () => {
  const was = {
    width: state.width,
    height: state.height,
    legendSize: state.legendSize,
  }
  Object.assign(state, {
    width: 900,
    height: 640,
    legendSize: { width: 0, height: 0 },
  })
  expect(layoutFit()).toEqual({ width: 900, height: 640 })
  state.legendSize = { width: 150, height: 300 }
  expect(layoutFit()).toEqual({ width: 900 - 150 - 2 * 6, height: 640 })
  Object.assign(state, was)
})

// chrM:8,000-8,300 once drew a skip at one fit and counted it at the next,
// and a key column that followed the key re-fitted until the stack overflowed
test('a key drawn after a fit moves the fit only when it grew, and only while the view is fitted', () => {
  const was = {
    width: state.width,
    height: state.height,
    legendSize: state.legendSize,
    owner: state.owner,
  }
  Object.assign(state, {
    width: 900,
    height: 640,
    legendSize: { width: 150, height: 300 },
    owner: 'fit',
  })
  const room = layoutFit().width
  state.legendSize = { width: 120, height: 300 }
  expect(keyMovesFit(room)).toBe(false)
  state.legendSize = { width: 180, height: 300 }
  expect(keyMovesFit(room)).toBe(true)
  state.owner = 'user'
  expect(keyMovesFit(room)).toBe(false)
  Object.assign(state, was)
})
