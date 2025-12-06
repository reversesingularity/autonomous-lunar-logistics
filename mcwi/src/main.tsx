import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { FleetDataProvider } from './providers';
import App from './App';
import './index.css';

// Import Cesium CSS
import 'cesium/Build/Cesium/Widgets/widgets.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <FleetDataProvider>
        <App />
      </FleetDataProvider>
    </Provider>
  </React.StrictMode>
);
