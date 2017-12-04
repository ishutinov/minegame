import { pt, Ray, sum, sub, unit, distance, Segment } from 'math'
import PriorityQueue from 'priorityqueuejs'
export class NavPoint {
  constructor (pos = pt(0, 0)) {
    this.position = pos
    // if (this.position.x === 0) this.position.x = 0.0001
    // if (this.position.y === 0) this.position.y = 0.0001
    this.neighbors = []
    this.label = -1
  }

  addNeighbors (...neighbors) {
    for (let neighbor of neighbors) {
      let n = {cost: distance(this.position, neighbor.position), point: neighbor}
      this.neighbors.push(n)
    }
  }
}

export default class NavMesh {
  constructor (points = []) {
    this.points = []
    this.addPoints(...points)
    this.newPQ()
    this.size = 0
  }

  newPQ () {
    this.pq = new PriorityQueue((a, b) => -(a.cost - b.cost))
  }

  addPoints (...points) {
    for (let point of points) {
      point.label = this.size++
      this.points.push(point)
    }
  }

  search (source, target) {
    this.newPQ()
    let openSet = this.pq
    let closedSet = {}
    openSet.enq({cost: 0, point: source, parent: null})
    // console.log(`searching for ${source.label} -> ${target.label}`)
    // Iterate through the empty set
    while (!openSet.isEmpty()) {
      const smallest = openSet.deq()
      // openSet.forEach(console.log)
      // console.log(`Now looking at `, smallest.cost)
      if (smallest.point === target) {
        // Return path to node
        // console.log('target found!')
        closedSet[smallest.point.label] = smallest
        let returnList = []
        for (let node = closedSet[target.label]; true; node = closedSet[node.parent.point.label]) {
          returnList.unshift(node)
          if (node.parent === null) break
        }
        return returnList
      } else {
        // console.log('looking through neighbors', smallest.point.neighbors)
        let i = 0
        for (let neighbor of smallest.point.neighbors) {
          i++
          if (i > 8) break
          var edge = {
            cost: smallest.cost + neighbor.cost,
            point: neighbor.point,
            parent: smallest
          }
          // console.log(`Adding node with cost ${edge.cost}`, edge)
          if (closedSet[edge.point.label]) {
            continue
          }
          openSet.enq(edge)
        }
        closedSet[smallest.point.label] = smallest
      }
    }
  }

  computeNavmeshNeighbors (geometry) {
    for (let nav of this.points) {
      for (let nextNav of this.points) {
        if (nav === nextNav) continue
        let seg = new Segment(
          nav.position,
          nextNav.position
        )
        let inter = null
        for (let geom of geometry) {
          inter = geom.polygon.intersectsSegment(seg)
          if (inter) break
        }
        if (!inter) {
          nav.addNeighbors(nextNav)
        }
      }
      nav.neighbors.sort((a, b) => a.cost - b.cost)
    }
    console.log('navmeshComplete')
    console.log(this.points)
    this.path = this.search(this.points[0], this.points[this.size - 2])
  }

  getNearestPoint (pt) {
    let nearest = Infinity
    let nearestIndex = -1
    for (let i = 0, size = this.points.length; i < size; i++) {
      let np = this.points[i].position
      let dist = (np.x - pt.x) * (np.x - pt.x) + (np.y - pt.y) * (np.y - pt.y)
      if (dist < nearest) {
        nearest = dist
        nearestIndex = i
      }
    }
    return this.points[nearestIndex]
  }
}
