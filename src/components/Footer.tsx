import { Github } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full py-8 mt-12 border-t border-gray-200">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
                <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-gray-500 text-center">
                        Inspiriert durch das{' '}
                        <a 
                            href="https://systemchart.un.org/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            UN System Chart
                        </a>
                    </p>
                    <a
                        href="https://github.com/datenlabor-bmz/german-organigram"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="View source code on GitHub"
                    >
                        <Github className="w-5 h-5" />
                    </a>
                </div>
            </div>
        </footer>
    );
}
