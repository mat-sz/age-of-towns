/// <reference types="." />

import './App.scss';
import { Engine } from './engine';

import grass from './assets/grass.png';
import road from './assets/road.png';
import selection from './assets/selection.png';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const engine = new Engine(canvas);
engine.registerImageAsset('grass', grass);
engine.registerImageAsset('road', road);
engine.registerImageAsset('selection', selection);

engine.on('tileClicked', (x, y) => alert(x + ' ' + y));
