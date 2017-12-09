import { clamp, sub, pt, Segment, sum } from 'math'
import * as keys from 'engine/keys'
import Camera from './camera'
import EventManager, { Event } from './eventmanager'
import { BasicMine } from './projectile'
import { loadTiled } from './levelparser'
import { drawSegment } from 'engine/renderer'

export default class Stage {
  constructor ({
    onMount = _ => {},
    level = {}
  }) {
    this.loadLevel(level)
    this.onMount = onMount
    this.scene = null
  }

  testObjective (_e) {
    if (this.camera.mobs.length === 1 && this.camera.mobs[0].type === 'Player' && this.eventManager.events.length <= 0 && !this.winner) {
      this.round++
      this.roundStart = Date.now()
      if (this.rounds[this.round].length <= 0) {
        this.winner = true
        this.e.state.audioLoader.assets['win'].play()
      } else {
      }
    }
  }

  animCount = 0
  rgb = 23
  rgba = 23
  render = (e, c) => {
    this.animCount++
    global.debug = false
    c.clearRect(0, 0, e.width, e.height)
    global.player = this.player
    this.camera.render(c, e)

    let playerNav = this.camera.navMesh.getNearestPoint(this.player.position)
    for (let nav of this.camera.navMesh.points) {
      if (!this.debug) break
      if (nav === playerNav) {
        c.fillStyle = 'white'
      } else {
        c.fillStyle = 'red'
      }
      // Draw the point
      c.fillRect(this.camera.position.x + nav.position.x, this.camera.position.y + nav.position.y, 5, 5)
      if (!global.debug) continue
      c.fillStyle = 'white'
      for (let neighbor of nav.neighbors) {
        let seg = new Segment(sum(nav.position, this.camera.position), sum(neighbor.point.position, this.camera.position))
        drawSegment(c, seg)
      }
      let path = this.camera.navMesh.path
      if (path) {
        for (let i = 0, j = 1; i < path.length - 1; i++, j = (j + 1) % (path.length)) {
          let p0 = path[i]
          let p1 = path[j]
          let seg = new Segment(sum(p0.point.position, this.camera.position), sum(p1.point.position, this.camera.position))
          drawSegment(c, seg, 'yellow')
        }
        c.fillStyle = 'green'
        let pt = sum(path[0].point.position, this.camera.position)
        c.fillRect(pt.x - 6, pt.y - 6, 13, 13)
        let pt2 = sum(path[path.length - 1].point.position, this.camera.position)
        c.fillRect(pt2.x - 6, pt2.y - 6, 13, 13)
      }
    }

    if (!this.player.alive && !this.winner) {
      c.font = '52px MTV2C'
      if (this.animCount % 3 === 0) {
        this.rgb = Math.floor(255 - (Math.random() * 100))
        this.rgba = (Math.floor(Math.random() * 50))
      }
      c.fillStyle = `rgba(255, ${this.rgb}, ${this.rgba}, 1)`
      let w = c.measureText('Mission Failure')
      c.fillText('Mission Failure', e.width / 2 - w.width / 2, e.height / 2)
    }

    if (this.winner) {
      c.font = '52px MTV2C'
      if (this.animCount % 3 === 0) {
        this.rgb = Math.floor(255 - (Math.random() * 100))
        this.rgba = (Math.floor(Math.random() * 50))
      }
      c.fillStyle = `rgba(255, ${this.rgb}, ${this.rgba}, 1)`
      let w = c.measureText('Mission Complete')
      c.fillText('Mission Complete', e.width / 2 - w.width / 2, e.height / 2)
    }

    if ((Date.now() - this.roundStart) < 1000 * 3 && !this.winner && this.player.alive) {
      c.font = '52px MTV2C'
      if (this.animCount % 3 === 0) {
        this.rgb = Math.floor(255 - (Math.random() * 100))
        this.rgba = (Math.floor(Math.random() * 50))
      }
      c.fillStyle = `rgba(255, ${this.rgb}, ${this.rgba}, 1)`
      let text = 'Round Complete'
      if (this.round === 0) {
        text = 'Mission Start'
      }
      let w = c.measureText(text)
      c.fillText(text, e.width / 2 - w.width / 2, e.height / 2)
    }

    c.lineWidth = 3
    c.fillStyle = '#f4ad42'
    let barWidth = 250
    c.fillRect(e.width - (barWidth + 20), 20, barWidth * (this.charge / this.maxCharge), 75)

    c.drawImage(
      e.state.imageLoader.images['boostBar'],
      e.width - (barWidth + 20),
      20,
      barWidth,
      75
    )

    c.fillStyle = '#f00'
    let crossHairSize = 50
    let half = Math.floor(crossHairSize / 2)
    c.drawImage(
      e.state.imageLoader.images['crosshair'],
      e.mouse.x - half,
      e.mouse.y - half,
      crossHairSize,
      crossHairSize
    )
  }

  totalDelta = 0
  update = (e, delta) => {
    this.e = e
    let roundTime = (Date.now() - this.roundStart) / 1000
    let d = (delta - this.totalDelta) / (1000 / 60)
    if (d > 5) d = 1
    this.totalDelta = delta
    this.eventManager.events = this.rounds[this.round]
    this.eventManager.update(roundTime, this.camera)

    if (!this.player.alive) {
      for (let i = 0; i < this.camera.mobs.length; i++) {
        let mob = this.camera.mobs[i]
        if (mob.type === 'Player') {
          console.log('FOUND PLAYER')
          this.camera.mobs.splice(i, 1)
          break
        }
      }
      this.player._translate(-0xFFFFFFF, 0)
      this.selectedMob = this.camera.mobs[0]
      this.player.deadCounter++
      if (this.player.deadCounter > 60) {
        this.scene.goto('levelSelect')
      }
    } else {
      console.log(this.camera.mobs.indexOf(this.player))
      if (this.camera.mobs.indexOf(this.player) < 0) {
        this.player.alive = false
      }
    }

    if (this.winner) {
      this.winTime++
      if (this.winTime > 60 * 3) {
        this.scene.goto('levelSelect')
      }
    }

    this.testObjective(e)

    let p = this.camera.navMesh.getNearestPoint(this.player.position)
    this.camera.navMesh.path = this.camera.navMesh.search(this.camera.navMesh.points[0], p)

    // Charge
    this.camera.update(e, d, this)
    if (e.mouse.down) {
      this.charge = clamp(((this.charge + 1) * d), 0, this.maxCharge)
    }
    if (this.selectedMob) {
      this.camera.centerOn(this.selectedMob.position)
    }
    if (keys.H in e.keys) {
      this.camera.screenShake(50)
    }
  }

  throwMine (x, y) {
    let direction = sub(pt(x, y), this.player.position)
    let mine = new BasicMine(this.player.position, direction, 5 + (this.charge / this.maxCharge) * 17.5)
    this.camera.projectiles.push(mine)
  }

  onClick (e) {
    let x = e.mouse.x + -this.camera.position.x
    let y = e.mouse.y + -this.camera.position.y
    this.throwMine(x, y)
    console.log(x, y)
    this.charge = 0
  }

  keyUp (_e) {

  }

  keyEvents = {
    [keys.ONE]: _ => { this.selectedMob = this.camera.mobs[0] },
    [keys.TWO]: _ => { this.selectedMob = this.camera.mobs[1] },
    [keys.THREE]: _ => { this.selectedMob = this.camera.mobs[2] },
    [keys.ESC]: _ => { this.scene.goto('pause') },
    [keys.ENTER]: _ => { this.scene.goto('pause') },
    [keys.R]: _ => { global.debug = !global.debug }
  }

  mount (scene) {
    console.log(this)
    scene.render = this.render.bind(this)
    scene.update = this.update.bind(this)
    scene.onClick = this.onClick.bind(this)
    scene.keyUp = this.keyUp.bind(this)
    scene.keyEvents = this.keyEvents
    this.onMount(scene)
  }

  loadLevel (level) {
    this.camera = new Camera()
    this.charge = 0
    this.maxCharge = 60
    this.totalDelta = 0
    this.rounds = [[], [], [], [], [], [], [], [], [], [], []]
    this.round = 0
    this.winner = false
    this.winTime = 0
    this.roundStart = Date.now()
    this.eventManager = new EventManager()
    let lvl = loadTiled(level)
    this.camera.addGeometry(...lvl.geometry)
    this.camera.navMesh.addPoints(...lvl.navPoints)
    this.camera.navMesh.computeNavmeshNeighbors(this.camera.geometry)
    for (let mob of lvl.mobs) {
      if (mob.type === 'Player') {
        this.player = mob
      }
      let rnd = mob.round || 0
      this.rounds[rnd].push(new Event(mob.spawnTime || 0, _ => {
        this.camera.addMob(mob)
        this.e.state.audioLoader.assets['spawn'].play()
      }))
    }
    this.selectedMob = this.player
  }

  start (scene) {
    this.scene = scene
    this.mount(scene)
  }
}
