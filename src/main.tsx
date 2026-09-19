import 'reflect-metadata';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ApplicationProvider } from './ApplicationProvider';
import { createApplication } from './compositionRoot';
import './styles.css';

// Get the root element and render the app
const rootElement = document.getElementById('root');

if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<ApplicationProvider application={createApplication()}>
				<App />
			</ApplicationProvider>
		</StrictMode>,
	);
}
