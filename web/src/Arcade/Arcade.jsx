import { useState } from "react";
import Modal from "../UserInterface/Modal.jsx";
import { GamePicker } from "../BenchGames/shared/gameParts.jsx";
import BlockDrop from "./games/blockDrop/BlockDrop.jsx";
import Doubles from "./games/doubles/Doubles.jsx";
import FoxRun from "./games/foxRun/FoxRun.jsx";

// Games to play on your own, from the menu or a bench with nobody else on it. Each game is its
// screen and a pure rules module in games/<name>/, and keeps its best score in best.js.
const ARCADE_GAMES = [
  { id: "blockdrop", name: "Block Drop", blurb: "Fit the falling blocks together and clear rows." },
  { id: "doubles", name: "Doubles", blurb: "Slide the tiles. Two the same join into one." },
  { id: "foxrun", name: "Fox Run", blurb: "Run through town. Jump the lanterns, duck the crows." },
];

const SCREENS = { blockdrop: BlockDrop, doubles: Doubles, foxrun: FoxRun };

const Arcade = ({ onClose }) => {
  const [game, setGame] = useState(null);

  if (!game) {
    return (
      <Modal
        key="picking"
        title="Arcade"
        tagline="Games to play on your own."
        actionLabel="Never mind"
        onClose={onClose}
        closeOnBackdrop
        wide
        fullscreenOnPhones
      >
        <GamePicker games={ARCADE_GAMES} onPick={setGame} />
      </Modal>
    );
  }

  const { name, blurb } = ARCADE_GAMES.find((entry) => entry.id === game);
  const Screen = SCREENS[game];
  return (
    <Modal
      key={game}
      title={name}
      tagline={blurb}
      taglineOnPhones={false}
      fullscreenOnPhones
      wide={game === "foxrun"}
      actionLabel="Done"
      onClose={onClose}
      secondaryAction={{ label: "Other games", onClick: () => setGame(null) }}
    >
      <Screen />
    </Modal>
  );
};

export default Arcade;
