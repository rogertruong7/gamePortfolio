import { useEffect } from "react";
import styled from "styled-components";
import Modal from "../UserInterface/Modal.jsx";
import ChromeFrame, { chromeButton } from "../UserInterface/ChromeFrame.jsx";
import { isModalOpen } from "../Helpers/modal.js";
import { GAMES, gameName } from "./protocol.js";
import { GamePicker } from "./shared/gameParts.jsx";
import ConnectFour from "./games/connectFour/ConnectFour.jsx";
import RockPaperScissors from "./games/scissorsPaperRock/RockPaperScissors.jsx";
import TypeRace from "./games/typeRace/TypeRace.jsx";
import WordHunt from "./games/wordHunt/WordHunt.jsx";
import Anagrams from "./games/anagrams/Anagrams.jsx";
import SeaBattle from "./games/seaBattle/SeaBattle.jsx";
import DotsAndBoxes from "./games/dotsAndBoxes/DotsAndBoxes.jsx";
import FiveInARow from "./games/fiveInARow/FiveInARow.jsx";
import Checkers from "./games/checkers/Checkers.jsx";
import Pool from "./games/pool/Pool.jsx";
import CupToss from "./games/cupToss/CupToss.jsx";
import MiniGolf from "./games/miniGolf/MiniGolf.jsx";
import Darts from "./games/darts/Darts.jsx";
import Hoops from "./games/hoops/Hoops.jsx";
import Archery from "./games/archery/Archery.jsx";

const SCREENS = {
  connect4: ConnectFour,
  rps: RockPaperScissors,
  typing: TypeRace,
  wordhunt: WordHunt,
  anagrams: Anagrams,
  seabattle: SeaBattle,
  dots: DotsAndBoxes,
  gomoku: FiveInARow,
  checkers: Checkers,
  pool: Pool,
  cuptoss: CupToss,
  minigolf: MiniGolf,
  darts: Darts,
  hoops: Hoops,
  archery: Archery,
};

// Two people in the town can play a game together. One picks it, the other says yes, and it opens
// for both of them. games is from useBenchGame. partner is whoever else is sat on this player's
// bench, who gets a button to play with them, and asking anyone else starts from the player list.
// Sat alone, the same button opens the games to play on your own (onArcade).
const BenchGames = ({ games, partner, seated, onArcade }) => {
  const { session } = games;

  if (!session) {
    if (!seated) return null;
    if (partner) return <PlayButton onPress={() => games.openMenu(partner)} />;
    return onArcade ? <PlayButton onPress={onArcade} /> : null;
  }

  const name = session.partner.name;
  const key = `${session.phase}-${session.id}`;

  if (session.phase === "picking") {
    return (
      <Modal
        key={key}
        title="Play a game"
        tagline={`With ${name}.`}
        actionLabel="Never mind"
        onClose={games.close}
        closeOnBackdrop
        wide
        fullscreenOnPhones
      >
        <GamePicker games={GAMES} onPick={games.invite} />
      </Modal>
    );
  }

  if (session.phase === "inviting") {
    return (
      <Modal
        key={key}
        title={gameName(session.game)}
        tagline={`Waiting for ${name} to say yes…`}
        actionLabel="Cancel"
        onClose={games.close}
      />
    );
  }

  if (session.phase === "invited") {
    return (
      <Modal
        key={key}
        title={gameName(session.game)}
        tagline={`${name} wants to play ${gameName(session.game)} with you.`}
        actionLabel="Play"
        onClose={games.accept}
        onCancel={games.close}
        secondaryAction={{ label: "No thanks", onClick: games.close }}
      />
    );
  }

  if (session.phase === "over") {
    return (
      <Modal
        key={key}
        title={session.game ? gameName(session.game) : "Play a game"}
        tagline={session.note}
        actionLabel="OK"
        onClose={games.close}
      />
    );
  }

  const Screen = SCREENS[session.game];
  return (
    <Modal
      key={key}
      title={gameName(session.game)}
      tagline={`You vs ${name}`}
      taglineOnPhones={false}
      fullscreenOnPhones
      actionLabel="Leave game"
      onClose={games.close}
    >
      <Screen
        key={session.match}
        host={session.host}
        partnerName={name}
        match={session.match}
        again={session.again}
        sendMove={games.sendMove}
        listenMoves={games.listenMoves}
        onAgain={games.askAgain}
      />
    </Modal>
  );
};

// Sits just above the "Stand up" button. G opens it too.
const PlayButton = ({ onPress }) => {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== "g" || event.repeat || isModalOpen()) return;
      // Ctrl+G and the like are the browser's
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      onPress();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPress]);

  return (
    <PlayGamesButton id="play_games_button" type="button" onClick={onPress}>
      Play games (G)
      <ChromeFrame />
    </PlayGamesButton>
  );
};

const PlayGamesButton = styled.button`
  ${chromeButton}
  position: absolute;
  bottom: 110px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 102;
  padding: 12px 24px;
  font-size: 18px;
  font-weight: bold;
  white-space: nowrap;
  cursor: pointer;
`;

export default BenchGames;
