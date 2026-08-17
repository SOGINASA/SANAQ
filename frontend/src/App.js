import './App.css';
import { AppProviders } from './app/AppProviders';
import { AppRouter } from './app/router/AppRouter';

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
