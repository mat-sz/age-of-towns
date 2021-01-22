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

type EngineTileClickedEventListener = (tileX: number, tileY: number) => void;

interface EngineEventMap {
  tileClicked: EngineTileClickedEventListener;
}

export class Engine {
  private tileWidth = 132;
  private tileHeight = 65;
  private ctx: CanvasRenderingContext2D;

  private mapOffsetY = 0;
  private mapOffsetX = 0;

  private selectedTileX = -1;
  private selectedTileY = -1;
  private hoveredTileX = -1;
  private hoveredTileY = -1;

  private imageAssets: Record<string, HTMLImageElement> = {};

  private halfTileWidth = Math.ceil(this.tileWidth / 2);
  private halfTileHeight = Math.ceil(this.tileHeight / 2);

  private windowResized = false;

  private initialPointers: Pointer[] = undefined;
  private pointers: Pointer[] = [];
  private pointerDown = false;

  public map: string[][][] = [];

  private events: Record<keyof EngineEventMap, Set<any>> = {
    tileClicked: new Set<EngineTileClickedEventListener>(),
  };

  constructor(private canvas: HTMLCanvasElement) {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    this.ctx = canvas.getContext('2d');

    window.addEventListener('resize', () => {
      this.windowResized = true;
    });

    canvas.addEventListener('contextmenu', e => e.preventDefault(), false);

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

  private handlePointers(pointers: Pointer[]) {
    let oldPointers = [...this.pointers];
    this.pointers = pointers;

    if (!this.initialPointers && this.pointerDown) {
      this.initialPointers = [...this.pointers];
    }

    if (this.pointers[0] && oldPointers[0] && this.pointerDown) {
      this.mapOffsetX += this.pointers[0].x - oldPointers[0].x;
      this.mapOffsetY += this.pointers[0].y - oldPointers[0].y;
    }
  }

  private handleTileClick() {
    if (!this.initialPointers) {
      return;
    }

    const distance = Math.sqrt(
      Math.pow(this.pointers[0].x - this.initialPointers[0].x, 2) +
        Math.pow(this.pointers[0].y - this.initialPointers[0].y, 2)
    );

    if (distance > 10) {
      return;
    }

    let tileCoords = this.XYToTileCoords(
      this.pointers[0].x - this.mapOffsetX,
      this.pointers[0].y - this.mapOffsetY
    );
    this.selectedTileX = tileCoords.tx;
    this.selectedTileY = tileCoords.ty;

    this.emit('tileClicked', this.selectedTileX, this.selectedTileY);
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
    if (e.targetTouches.length === 0) {
      this.pointerDown = false;
    }
    this.touchXY(e);
  }

  private mouseXY(e: MouseEvent) {
    e.preventDefault();
    this.handlePointers([
      {
        x: e.pageX - this.canvas.offsetLeft,
        y: e.pageY - this.canvas.offsetTop,
        type: 'mouse',
      },
    ]);

    if (this.pointers[0]) {
      let tileCoords = this.XYToTileCoords(
        this.pointers[0].x - this.mapOffsetX,
        this.pointers[0].y - this.mapOffsetY
      );
      this.hoveredTileX = tileCoords.tx;
      this.hoveredTileY = tileCoords.ty;
    }

    if (!this.pointerDown) {
      if (this.pointers[0] && e.button === 0) {
        this.handleTileClick();
      }

      this.pointers = [];
      this.initialPointers = undefined;
    }
  }

  private touchXY(e: TouchEvent) {
    e.preventDefault();
    this.handlePointers(
      [...e.targetTouches].map(touch => ({
        x: touch.pageX - this.canvas.offsetLeft,
        y: touch.pageY - this.canvas.offsetTop,
        type: 'touch',
      }))
    );

    if (this.pointers[0]) {
      let tileCoords = this.XYToTileCoords(
        this.pointers[0].x - this.mapOffsetX,
        this.pointers[0].y - this.mapOffsetY
      );
      this.hoveredTileX = tileCoords.tx;
      this.hoveredTileY = tileCoords.ty;
    }

    if (!this.pointerDown) {
      if (this.pointers[0]) {
        this.handleTileClick();
      }

      this.pointers = [];
      this.initialPointers = undefined;
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

            if (i === 0 && x === this.hoveredTileX && y === this.hoveredTileY) {
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

  on<K extends keyof EngineEventMap>(
    eventType: K,
    listener: EngineEventMap[K]
  ): void {
    this.events[eventType].add(listener as any);
  }

  off<K extends keyof EngineEventMap>(
    eventType: K,
    listener: EngineEventMap[K]
  ): void {
    this.events[eventType].delete(listener as any);
  }

  private emit<K extends keyof EngineEventMap>(eventType: K, ...args: any[]) {
    for (const listener of this.events[eventType]) {
      (listener as Function).apply(this, args);
    }
  }
}
