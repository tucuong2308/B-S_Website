import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Result from './pages/Result';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Register from './pages/Register';
import News from './pages/News';
import Analysis from './pages/Analysis';
import Comparison from './pages/Comparison';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/comparison" element={<Comparison />} />
          <Route path="/news" element={<News />} />
          <Route path="/result" element={<Result />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
