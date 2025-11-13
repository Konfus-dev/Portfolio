import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js?module';
import { GLTFLoader } from 'https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js?module';

import { signals } from '../data/signals.js';
import { showLoadingBar, abortLoadingBar } from '../ui/loadingBar.js';
import { openSignalPopup, closeSignalPopup, isPopupOpen } from '../ui/signalPopup.js';

const inspectorSection = document.querySelector('[data-scene="inspector"]');
const overlayText = inspectorSection.querySelector('.inspector__overlay');
const readoutTitle = inspectorSection.querySelector('.signal-readout__title');
const readoutSubtitle = inspectorSection.querySelector('.signal-readout__subtitle');
const readoutSummary = inspectorSection.querySelector('.signal-readout__summary');
const readoutChannel = inspectorSection.querySelector('.signal-readout__channel');
const readoutStackList = inspectorSection.querySelector('.signal-readout__stack-list');
const readoutCoords = inspectorSection.querySelector('.signal-readout__coords');

let renderer;
let scene;
let camera;
let controls;
let planetGroup;
let placeholderPlanet;
let overlayShell;
let gridShell;
let planetModel;
let animationId;
let inspectorReady = false;
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const signalMeshes = [];
let hoveredMarker = null;
let activeMarker = null;
let pointerDown = null;
let pendingSelection = null;

const loader = new GLTFLoader();
const baseRadius = 1.82;
let planetRadius = baseRadius;

function updateMarkerPositions(radius) {
  const markerRadius = radius + 0.12;
  signalMeshes.forEach((marker) => {
    const { signal } = marker.userData;
    marker.position.copy(latLonToVector3(signal.lat, signal.lon, markerRadius));
    marker.lookAt(new THREE.Vector3(0, 0, 0));
  });
}

function updatePlanetScale(radius) {
  planetRadius = radius;

  if (placeholderPlanet) {
    placeholderPlanet.scale.setScalar(radius);
  }

  if (overlayShell) {
    overlayShell.scale.setScalar(radius + 0.05);
  }

  if (gridShell) {
    gridShell.scale.setScalar(radius + 0.08);
  }

  updateMarkerPositions(radius);

  if (controls) {
    controls.minDistance = Math.max(radius * 2.35, 3.4);
    controls.maxDistance = radius * 4.1;
    controls.update();
  }
}

function latLonToVector3(lat, lon, radius) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function resetReadout() {
  readoutTitle.textContent = 'Awaiting input…';
  readoutSubtitle.textContent = 'Engage a signal marker to review the project dossier.';
  readoutSummary.textContent = 'The archive is ready. Rotate the orb and select a glowing node to decrypt its contents.';
  readoutChannel.textContent = '—';
  readoutStackList.innerHTML = '';
  const placeholder = document.createElement('li');
  placeholder.textContent = '—';
  readoutStackList.appendChild(placeholder);
  readoutCoords.textContent = '—';
  overlayText.textContent = 'TRACKING SIGNALS...';
}

function updateReadout(signal) {
  if (!signal) {
    resetReadout();
    return;
  }

  readoutTitle.textContent = signal.name;
  readoutSubtitle.textContent = signal.tagline;
  readoutSummary.textContent = signal.summary;
  readoutChannel.textContent = signal.id;
  readoutCoords.textContent = `${signal.lat.toFixed(2)}° / ${signal.lon.toFixed(2)}°`;
  readoutStackList.innerHTML = '';
  signal.stack.forEach((tech) => {
    const li = document.createElement('li');
    li.textContent = tech;
    readoutStackList.appendChild(li);
  });
  overlayText.textContent = `${signal.id} LOCKED`;
}

function highlightMarker(marker) {
  if (activeMarker && activeMarker !== marker) {
    const { material, baseColor, baseEmissive } = activeMarker.userData;
    material.color.copy(baseColor);
    material.emissive.copy(baseEmissive);
    material.emissiveIntensity = 1.4;
  }

  if (marker) {
    const { material } = marker.userData;
    material.color.set(0xd9ffe8);
    material.emissive.set(0x6bffd1);
    material.emissiveIntensity = 2.2;
    if (controls) {
      controls.autoRotate = false;
    }
  }

  activeMarker = marker || null;

  if (!activeMarker && controls) {
    controls.autoRotate = true;
  }
}

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerMove(event) {
  if (!renderer) return;
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(signalMeshes, false);
  hoveredMarker = intersects.length ? intersects[0].object : null;
  renderer.domElement.style.cursor = hoveredMarker ? 'pointer' : 'grab';
}

function onPointerDown(event) {
  pointerDown = { x: event.clientX, y: event.clientY };
}

async function handleSignalSelection(marker) {
  if (!marker) return;
  const signal = marker.userData.signal;
  pendingSelection = signal.id;

  abortLoadingBar();
  closeSignalPopup();
  highlightMarker(marker);
  updateReadout(signal);

  const duration = Math.floor(100 + Math.random() * 150);
  await showLoadingBar(duration);

  if (pendingSelection !== signal.id) {
    return;
  }

  openSignalPopup(signal);
}

function onPointerUp(event) {
  if (!pointerDown) return;
  const dx = Math.abs(event.clientX - pointerDown.x);
  const dy = Math.abs(event.clientY - pointerDown.y);
  const moved = Math.sqrt(dx * dx + dy * dy) > 6;
  pointerDown = null;
  if (moved) {
    return;
  }

  if (hoveredMarker) {
    handleSignalSelection(hoveredMarker);
  }
}

function buildScene() {
  const display = inspectorSection.querySelector('.inspector__display');
  const canvas = inspectorSection.querySelector('#planet-canvas');

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(45, display.clientWidth / display.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 5.75);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(display.clientWidth, display.clientHeight, false);

  planetGroup = new THREE.Group();
  scene.add(planetGroup);

  const placeholderGeometry = new THREE.SphereGeometry(1, 64, 64);
  const placeholderMaterial = new THREE.MeshStandardMaterial({
    color: 0x06271c,
    roughness: 0.6,
    metalness: 0.2,
    emissive: 0x06201a,
    emissiveIntensity: 0.8,
  });
  placeholderPlanet = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
  placeholderPlanet.scale.setScalar(baseRadius);
  planetGroup.add(placeholderPlanet);

  const overlayGeometry = new THREE.SphereGeometry(1, 64, 64);
  const overlayMaterial = new THREE.MeshStandardMaterial({
    color: 0x11ff96,
    transparent: true,
    opacity: 0.1,
    emissive: 0x1bffb0,
    emissiveIntensity: 0.55,
    blending: THREE.AdditiveBlending,
  });
  overlayShell = new THREE.Mesh(overlayGeometry, overlayMaterial);
  overlayShell.material.side = THREE.BackSide;
  overlayShell.scale.setScalar(baseRadius + 0.05);
  planetGroup.add(overlayShell);

  const gridGeometry = new THREE.SphereGeometry(1, 48, 48, 0, Math.PI * 2, 0, Math.PI);
  const gridMaterial = new THREE.MeshBasicMaterial({
    wireframe: true,
    color: 0x20ffad,
    transparent: true,
    opacity: 0.22,
  });
  gridShell = new THREE.Mesh(gridGeometry, gridMaterial);
  gridShell.scale.setScalar(baseRadius + 0.08);
  planetGroup.add(gridShell);

  const ambient = new THREE.AmbientLight(0x83ffd4, 0.35);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xb4ffe6, 0.85);
  keyLight.position.set(5, 3, 6);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x46f7c0, 0.75);
  rimLight.position.set(-6, -4, -3);
  scene.add(rimLight);

  const markerGeometry = new THREE.SphereGeometry(0.085, 20, 20);

  signals.forEach((signal) => {
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0x92ffcf,
      emissive: 0x2bff95,
      emissiveIntensity: 1.4,
      roughness: 0.35,
      metalness: 0.15,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.userData = {
      signal,
      material: markerMaterial,
      baseColor: markerMaterial.color.clone(),
      baseEmissive: markerMaterial.emissive.clone(),
    };
    planetGroup.add(marker);
    signalMeshes.push(marker);
  });

  updateMarkerPositions(baseRadius);

  const modelUrl = new URL('../../assets/models/planet.glb', import.meta.url);
  loader.load(
    modelUrl.href,
    (gltf) => {
      planetModel = gltf.scene;
      planetModel.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.metalness = 0.45;
          child.material.roughness = 0.3;
          if ('emissive' in child.material) {
            child.material.emissive = new THREE.Color(0x0b1f2d);
            child.material.emissiveIntensity = 0.6;
          }
        }
      });

      const box = new THREE.Box3().setFromObject(planetModel);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDimension = Math.max(size.x, size.y, size.z);
      if (maxDimension > 0) {
        const targetDiameter = baseRadius * 2;
        const scale = targetDiameter / maxDimension;
        planetModel.scale.setScalar(scale);
      }

      planetGroup.add(planetModel);

      if (placeholderPlanet) {
        planetGroup.remove(placeholderPlanet);
        placeholderPlanet.geometry.dispose();
        placeholderPlanet.material.dispose();
        placeholderPlanet = null;
      }

      box.setFromObject(planetModel);
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);

      if (!Number.isNaN(sphere.radius) && sphere.radius > 0) {
        updatePlanetScale(sphere.radius);
      } else {
        updatePlanetScale(baseRadius);
      }
    },
    undefined,
    (error) => {
      console.error('Failed to load planet model', error);
      updatePlanetScale(baseRadius);
    }
  );

  const particlesGeometry = new THREE.BufferGeometry();
  const particleCount = 600;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 3.5 + Math.random() * 6;
    const y = (Math.random() - 0.5) * 6;
    positions[i * 3] = Math.cos(angle) * distance;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * distance;
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.035,
    color: 0x2aff96,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particles);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3.6;
  controls.maxDistance = 7;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.45;
  controls.target.set(0, 0, 0);
  controls.update();

  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });
  controls.addEventListener('end', () => {
    if (!activeMarker) {
      controls.autoRotate = true;
    }
  });

  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointerleave', () => {
    hoveredMarker = null;
    renderer.domElement.style.cursor = 'grab';
  });

  window.addEventListener('resize', onResize);
}

function onResize() {
  if (!renderer || !camera) return;
  const display = inspectorSection.querySelector('.inspector__display');
  const width = display.clientWidth;
  const height = display.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (planetGroup) {
    planetGroup.rotation.y += 0.0006;
  }
  if (controls) {
    controls.update();
  }
  renderer.render(scene, camera);
}

function startAnimation() {
  if (!animationId) {
    animate();
  }
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

export function initInspectorScene() {
  if (inspectorReady) {
    return {
      activate() {
        startAnimation();
      },
      deactivate() {
        stopAnimation();
      },
      resetSelection() {
        pendingSelection = null;
        highlightMarker(null);
        updateReadout(null);
        closeSignalPopup();
        abortLoadingBar();
      },
    };
  }

  buildScene();
  resetReadout();
  inspectorReady = true;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAnimation();
    } else if (inspectorReady) {
      startAnimation();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (isPopupOpen()) {
        closeSignalPopup();
        return;
      }
      pendingSelection = null;
      highlightMarker(null);
      updateReadout(null);
      abortLoadingBar();
    }
  });

  return {
    activate() {
      startAnimation();
    },
    deactivate() {
      stopAnimation();
    },
    resetSelection() {
      pendingSelection = null;
      highlightMarker(null);
      updateReadout(null);
      closeSignalPopup();
      abortLoadingBar();
    },
  };
}
