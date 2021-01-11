export interface Asset {
  name: string;
  path: string;
  type: 'image';
}

export interface Pointer {
  type: 'mouse' | 'touch';
  x: number;
  y: number;
}

interface EngineEvents {}

export class Engine {
  private tileWidth = 132;
  private tileHeight = 65;
  private ctx: CanvasRenderingContext2D;

  private mapOffsetY = 0;
  private mapOffsetX = 0;
  private selectedTileX = -1;
  private selectedTileY = -1;

  private imageAssets: Record<string, HTMLImageElement> = {};

  private halfTileWidth = Math.ceil(this.tileWidth / 2);
  private halfTileHeight = Math.ceil(this.tileHeight / 2);

  private windowResized = false;

  private pointers: Pointer[] = [];
  private pointerDown = false;

  private map: string[][][] = [];
  private mapSize = 512;

  private events: EngineEvents = {};

  constructor(private canvas: HTMLCanvasElement) {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    this.ctx = canvas.getContext('2d');

    window.addEventListener('resize', () => {
      this.windowResized = true;
    });

    canvas.addEventListener('contextmenu', e => e.preventDefault(), false);

    for (let x = 0; x < this.mapSize; x++) {
      this.map[x] = [];
      for (let y = 0; y < this.mapSize; y++) {
        this.map[x][y] = ['grass'];
      }
    }

    this.mouseDown = this.mouseDown.bind(this);
    this.mouseXY = this.mouseXY.bind(this);
    this.mouseUp = this.mouseUp.bind(this);
    this.touchDown = this.touchDown.bind(this);
    this.touchXY = this.touchXY.bind(this);
    this.touchUp = this.touchUp.bind(this);
    this.render = this.render.bind(this);

    this.render();

    canvas.addEventListener('mousedown', this.mouseDown, false);
    canvas.addEventListener('mousemove', this.mouseXY, false);
    canvas.addEventListener('touchstart', this.touchDown, false);
    canvas.addEventListener('touchend', this.touchUp, false);
    canvas.addEventListener('touchmove', this.touchXY, false);

    document.body.addEventListener('mouseup', this.mouseUp, false);
    document.body.addEventListener('touchcancel', this.touchUp, false);
  }

  registerImageAsset(name: string, path: string) {
    this.imageAssets[name] = new Image();
    this.imageAssets[name].src = path;
  }

  private mouseUp(e: MouseEvent) {
    e.preventDefault();
    this.pointerDown = false;
    this.mouseXY(e);
  }

  private mouseDown(e: MouseEvent) {
    e.preventDefault();
    this.pointerDown = true;
    this.mouseXY(e);
  }

  private touchDown(e: TouchEvent) {
    e.preventDefault();
    this.pointerDown = true;
    this.touchXY(e);
  }

  private touchUp(e: TouchEvent) {
    e.preventDefault();
    if (e.targetTouches.length == 0) {
      this.pointerDown = false;
    }
  }

  private mouseXY(e: MouseEvent) {
    e.preventDefault();
    let oldPointers = [...this.pointers];
    this.pointers = [];
    this.pointers[0] = { x: 0, y: 0, type: 'mouse' };
    this.pointers[0].x = e.pageX - this.canvas.offsetLeft;
    this.pointers[0].y = e.pageY - this.canvas.offsetTop;
    if (this.pointers[0] && this.pointerDown && e.button == 0) {
      this.mapOffsetX += this.pointers[0].x - oldPointers[0].x;
      this.mapOffsetY += this.pointers[0].y - oldPointers[0].y;
    }

    if (this.pointers[0] && this.pointerDown && e.button == 0) {
      let tileCoords = this.XYToTileCoords(
        this.pointers[0].x - this.mapOffsetX,
        this.pointers[0].y - this.mapOffsetY
      );
      this.selectedTileX = tileCoords.tx;
      this.selectedTileY = tileCoords.ty;
    }
  }

  private touchXY(e: TouchEvent) {
    e.preventDefault();
    this.pointers = [];
    for (let i = 0; i < e.targetTouches.length; i++) {
      this.pointers[i] = { x: 0, y: 0, type: 'touch' };
      this.pointers[i].x = e.targetTouches[i].pageX - this.canvas.offsetLeft;
      this.pointers[i].y = e.targetTouches[i].pageY - this.canvas.offsetTop;
    }
  }

  private drawTile(image: HTMLImageElement, x: number, y: number) {
    if (!image || !image.complete || image.naturalWidth === 0) {
      return;
    }

    this.ctx.drawImage(
      image,
      this.mapOffsetX + x + (this.tileWidth - image.width),
      this.mapOffsetY + y + (this.tileHeight - image.height)
    );
  }

  private isXYVisible(x: number, y: number) {
    return (
      x + this.mapOffsetX <= this.canvas.width &&
      x + this.tileWidth + this.mapOffsetX > 0 &&
      y + this.mapOffsetY <= this.canvas.height &&
      y + this.tileHeight + this.mapOffsetY > 0
    );
  }

  private tileCoordsToXY(tx: number, ty: number) {
    return {
      x: (tx - ty) * this.halfTileWidth,
      y: (tx + ty) * this.halfTileHeight,
    };
  }

  private XYToTileCoords(x: number, y: number) {
    return {
      tx: Math.floor(
        (x / this.halfTileWidth + y / this.halfTileHeight) / 2 - 0.5
      ),
      ty: Math.floor(
        (y / this.halfTileHeight - x / this.halfTileWidth) / 2 + 0.5
      ),
    };
  }

  private render() {
    if (this.windowResized) {
      this.canvas.width = document.body.clientWidth;
      this.canvas.height = document.body.clientHeight;
      this.windowResized = false;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let currentTileX = -1;
    let currentTileY = -1;

    if (this.pointers[0]) {
      let tileCoords = this.XYToTileCoords(
        this.pointers[0].x - this.mapOffsetX,
        this.pointers[0].y - this.mapOffsetY
      );
      currentTileX = tileCoords.tx;
      currentTileY = tileCoords.ty;
    }

    for (let x = 0; x < this.map.length; x++) {
      for (let y = 0; y < this.map[x].length; y++) {
        let coords = this.tileCoordsToXY(x, y);

        if (this.isXYVisible(coords.x, coords.y)) {
          for (let i = 0; i < this.map[x][y].length; i++) {
            this.drawTile(
              this.imageAssets[this.map[x][y][i]],
              coords.x,
              coords.y
            );

            if (i == 0 && x == currentTileX && y == currentTileY) {
              if (!this.pointerDown) {
                this.drawTile(
                  this.imageAssets['selection'],
                  coords.x,
                  coords.y
                );
              } else {
                this.drawTile(
                  this.imageAssets['selection_down'],
                  coords.x,
                  coords.y
                );
              }
            }
          }
        }
      }
    }

    requestAnimationFrame(this.render);
  }

  on(eventType: keyof EngineEvents, listener: Function): void {
    this.events[eventType].add(listener as any);
  }

  off(eventType: keyof EngineEvents, listener: Function): void {
    this.events[eventType].delete(listener as any);
  }

  private emit(eventType: keyof EngineEvents, ...args: any[]) {
    for (const listener of this.events[eventType]) {
      (listener as Function).apply(this, args);
    }
  }
}
