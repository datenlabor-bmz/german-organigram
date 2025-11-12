export default function Footer() {
    return (
        <footer className="w-full py-8 mt-12 border-t border-gray-200">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
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
            </div>
        </footer>
    );
}
