export class SceneManager {
  constructor(sceneNodes) {
    this.scenes = new Map();
    sceneNodes.forEach((node) => {
      const name = node.dataset.scene;
      if (name) {
        this.scenes.set(name, node);
      }
    });
    this.activeScene = [...this.scenes.keys()].find((key) => this.scenes.get(key).classList.contains('scene--active'));
    this.onSceneChange = null;
  }

  show(sceneName) {
    if (!this.scenes.has(sceneName) || this.activeScene === sceneName) {
      return;
    }
    const previousScene = this.activeScene;
    this.scenes.forEach((node, key) => {
      const isTarget = key === sceneName;
      node.classList.toggle('scene--active', isTarget);
      node.setAttribute('aria-hidden', isTarget ? 'false' : 'true');
    });
    this.activeScene = sceneName;
    if (typeof this.onSceneChange === 'function') {
      this.onSceneChange(sceneName, previousScene);
    }
  }
}
