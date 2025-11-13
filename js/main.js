import { SceneManager } from './utils/sceneManager.js';
import { initLandingScene } from './scenes/landingScene.js';
import { initInspectorScene } from './scenes/inspectorScene.js';
import { showLoadingBar } from './ui/loadingBar.js';

const statusIndicator = document.getElementById('terminal-status');
const sceneManager = new SceneManager(document.querySelectorAll('.scene'));
const inspectorController = initInspectorScene();
let callSign = null;

const landingController = initLandingScene({
  async onAccessGranted(payload) {
    callSign = payload.callSign.toUpperCase();
    statusIndicator.textContent = 'AUTHENTICATING...';
    await showLoadingBar({ duration: 620, label: 'Initializing inspector' });
    sceneManager.show('inspector');
  },
});

statusIndicator.textContent = 'AWAITING INPUT';
landingController.focus();

sceneManager.onSceneChange = (sceneName, previousScene) => {
  if (sceneName === 'landing') {
    statusIndicator.textContent = 'AWAITING INPUT';
    landingController.focus();
    inspectorController.deactivate?.();
    inspectorController.resetSelection?.();
  }

  if (sceneName === 'inspector') {
    inspectorController.activate?.();
    const suffix = callSign ? ` // ${callSign}` : '';
    statusIndicator.textContent = `INSPECTOR ONLINE${suffix}`;
  }

  if (previousScene === 'inspector' && sceneName !== 'inspector') {
    inspectorController.deactivate?.();
  }
};
