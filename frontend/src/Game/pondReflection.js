import * as THREE from "three";

const _size = new THREE.Vector2();
const _cameraPosition = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _rotation = new THREE.Matrix4();
const _plane = new THREE.Plane();
const _clip = new THREE.Vector4();
const _q = new THREE.Vector4();
const _bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const CLIP_BIAS = 0.001;
// The ripples hide the softer picture, and this keeps the memory it needs well down
const RESOLUTION = 0.5;

// Draws the town as seen from a camera mirrored under the water, into a texture the water can
// show. That's a second pass over the whole scene, so it only runs while someone's looking.
export function createPondReflection(waterY) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    samples: 2,
    type: THREE.HalfFloatType,
  });
  const mirrorCamera = new THREE.PerspectiveCamera();
  // Turns a point in the world into its spot on the texture
  const worldToTexture = new THREE.Matrix4();
  const surfacePoint = new THREE.Vector3(0, waterY, 0);
  let holdingMemory = false;

  function mirrorY(vector) {
    vector.y = 2 * waterY - vector.y;
    return vector;
  }

  function placeCamera(mainCamera) {
    _cameraPosition.setFromMatrixPosition(mainCamera.matrixWorld);
    _rotation.extractRotation(mainCamera.matrixWorld);
    _forward.set(0, 0, -1).applyMatrix4(_rotation).add(_cameraPosition);
    _up.set(0, 1, 0).applyMatrix4(_rotation);

    mirrorCamera.position.copy(mirrorY(_cameraPosition));
    mirrorCamera.up.set(_up.x, -_up.y, _up.z);
    mirrorCamera.lookAt(mirrorY(_forward));
    mirrorCamera.near = mainCamera.near;
    mirrorCamera.far = mainCamera.far;
    mirrorCamera.updateMatrixWorld();
    mirrorCamera.projectionMatrix.copy(mainCamera.projectionMatrix);

    worldToTexture
      .copy(_bias)
      .multiply(mirrorCamera.projectionMatrix)
      .multiply(mirrorCamera.matrixWorldInverse);
  }

  // Moves the near side of the view onto the water, so nothing below the surface gets in the way
  function clipAtSurface() {
    _plane.setFromNormalAndCoplanarPoint(UP, surfacePoint);
    _plane.applyMatrix4(mirrorCamera.matrixWorldInverse);
    _clip.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);

    const projection = mirrorCamera.projectionMatrix.elements;
    _q.x = (Math.sign(_clip.x) + projection[8]) / projection[0];
    _q.y = (Math.sign(_clip.y) + projection[9]) / projection[5];
    _q.z = -1;
    _q.w = (1 + projection[10]) / projection[14];
    _clip.multiplyScalar(2 / _clip.dot(_q));

    projection[2] = _clip.x;
    projection[6] = _clip.y;
    projection[10] = _clip.z + 1 - CLIP_BIAS;
    projection[14] = _clip.w;
  }

  return {
    texture: target.texture,
    worldToTexture,
    render(gl, scene, mainCamera, water) {
      gl.getDrawingBufferSize(_size).multiplyScalar(RESOLUTION).floor();
      if (target.width !== _size.x || target.height !== _size.y) {
        target.setSize(_size.x, _size.y);
      }
      holdingMemory = true;

      placeCamera(mainCamera);
      clipAtSurface();

      const previousTarget = gl.getRenderTarget();
      const updatedShadows = gl.shadowMap.autoUpdate;
      gl.shadowMap.autoUpdate = false;
      water.visible = false;

      gl.setRenderTarget(target);
      gl.clear();
      gl.render(scene, mirrorCamera);

      water.visible = true;
      gl.shadowMap.autoUpdate = updatedShadows;
      gl.setRenderTarget(previousTarget);
    },
    // The next render sets the texture up again
    release() {
      if (!holdingMemory) return;
      target.dispose();
      holdingMemory = false;
    },
  };
}
