import React from "react";
import "./App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./MainPage.jsx";
import TributaryAPIPage from "./Pages/ProjectPages/TributaryPage.jsx";
import QuizPage from "./Pages/ProjectPages/QuizPage.jsx";
import RedirectToHome from "./Helpers/Redirect.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/projects/tributary" element={<TributaryAPIPage />} />
        <Route path="/projects/quiz-website" element={<QuizPage />} />
        <Route path="*" element={<RedirectToHome />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
