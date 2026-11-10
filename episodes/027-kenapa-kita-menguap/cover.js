// Cover set for the thumbnail: Affan alone under a purple night sky.
import * as THREE from 'three';
import { makeAffan } from '../../shared/affan.js';
import { makeSky, makeStars, makeMoon } from '../../shared/props.js';

export function buildCover() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x120a3a, mid: 0x2b1d72, horizon: 0x6a4bb8, bottom: 0x120a3a });
  const stars = makeStars(1100, 1600, 27);
  const moon = makeMoon(40);
  moon.position.set(-420, 820, -1500);
  scene.add(sky, stars, moon);
  scene.add(new THREE.HemisphereLight(0xe4dcff, 0x3a2a60, 1.25));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.1);
  key.position.set(3, 6, 8);
  key.castShadow = true;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb9a8ff, 1.6);
  rim.position.set(-6, 4, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, sky, stars, aff };
}
