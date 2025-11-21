'use client';

import EntitiesGrid from '@/components/EntitiesGrid';
import Footer from '@/components/Footer';
import DataSourceCards from '@/components/DataSourceCards';
import { Suspense, useRef } from 'react';

export default function Home() {
    const entitiesGridRef = useRef<{ handleReset: () => void; toggleGroup: (groupKey: string) => void }>(null);

    const handleTitleClick = () => {
        entitiesGridRef.current?.handleReset();
    };



    return (
        <>
            <main className="flex-grow w-full p-3 sm:p-4 lg:p-6">
                <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6">
                    <div className="flex flex-col gap-3 mt-2 sm:mt-4">
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                            <h1 className="text-left">
                                <button
                                    onClick={handleTitleClick}
                                    className="group inline-flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0 transition-all duration-200 cursor-pointer bg-transparent border-none p-0 text-left"
                                    aria-label="Reset filters and return to home view"
                                >
                                    <span className="text-2xl sm:text-4xl lg:text-5xl font-normal text-foreground group-hover:text-blue-600 transition-colors leading-tight whitespace-nowrap">
                                        Organigramm der
                                    </span>
                                    <span className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground group-hover:text-blue-600 transition-colors leading-tight whitespace-nowrap">
                                        Bundesregierung
                                    </span>
                                </button>
                            </h1>
                        </div>
                        <p className="text-gray-600 text-base sm:text-base lg:text-lg leading-snug sm:leading-relaxed">
                            Übersicht der Behörden und Einrichtungen der deutschen Bundesregierung.
                        </p>
                        <p className="text-gray-600 text-base sm:text-base lg:text-lg leading-snug sm:leading-relaxed">
                            Dies ist eine experimentelle Website des BMZ-Datenlabors und <b>keine offizielle Website der Bundesregierung</b>.
                        </p>
                    </div>
                    <DataSourceCards />
                    <Suspense fallback={<div className="min-h-screen"></div>}>
                        <EntitiesGrid ref={entitiesGridRef} />
                    </Suspense>
                </div>
            </main>
            <Footer />
        </>
    );
}
