import { useEffect, useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { dressCharacter } from "./dressCharacter.js";

export const CHARACTER_MODEL = "/models/cloudme.glb";

// Every character on screen is its own copy of the model, so each can wear a different look. The
// copies share their shapes and texture, and the loaded original is never drawn itself.
export function useCharacterModel(look) {
  const { scene, animations } = useGLTF(CHARACTER_MODEL);
  const model = useMemo(() => clone(scene), [scene]);
  const dress = useMemo(() => dressCharacter(model), [model]);

  // A layout effect, so the look is on before PlayerShadow's effect copies its pieces
  useLayoutEffect(() => {
    dress.apply(look);
  }, [dress, look]);

  useEffect(() => () => dress.dispose(), [dress]);

  return { model, animations, dress };
}
