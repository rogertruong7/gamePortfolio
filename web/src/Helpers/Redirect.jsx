import { Navigate } from "react-router-dom";
import { townPath } from "../Multiplayer/roomCode.js";

// Back to the town, and to the room this tab was in
const RedirectToHome = () => {
  return <Navigate to={townPath()} />;
};

export default RedirectToHome;
