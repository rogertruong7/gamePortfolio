import * as THREE from "three";
import { resetPopupText } from "./game";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);



export function initProjectsGame() {

    console.log("hello world");
    return scene;
}

export function updateInfoGame() {
    return { camera };
}
