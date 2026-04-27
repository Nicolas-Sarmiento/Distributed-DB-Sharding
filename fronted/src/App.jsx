import { useState } from 'react';
import Vertical from './Vertical';
import Horizontal from './Horizontal';
import './styles.css';

function App() {
  const [view, setView] = useState('horizontal');

  return (
    <>
      <div className="view-switcher tech">
        <button 
          className={view === 'vertical' ? 'active' : ''} 
          onClick={() => setView('vertical')}
        >
          FRAGMENTACIÓN VERTICAL
        </button>
        <button 
          className={view === 'horizontal' ? 'active' : ''} 
          onClick={() => setView('horizontal')}
        >
          FRAGMENTACIÓN HORIZONTAL
        </button>
      </div>
      {view === 'vertical' ? <Vertical /> : <Horizontal />}
    </>
  );
}

export default App;
