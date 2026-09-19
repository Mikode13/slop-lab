import { createContext, useContext, type ReactNode } from 'react';
import type { Application } from '@/compositionRoot';

const ApplicationContext = createContext<Application | null>(null);

export function ApplicationProvider({
	application,
	children,
}: {
	application: Application;
	children: ReactNode;
}) {
	return <ApplicationContext.Provider value={application}>{children}</ApplicationContext.Provider>;
}

export function useApplication(): Application {
	const application = useContext(ApplicationContext);

	if (!application) {
		throw new Error('useApplication must be used inside an ApplicationProvider');
	}

	return application;
}
