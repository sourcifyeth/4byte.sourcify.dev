export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Sourcify Contract Viewer</div>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <a
              href="https://sourcify.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sourcify
            </a>
            <a
              href="https://github.com/ethereum/sourcify"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              GitHub
            </a>
            <a
              href="https://docs.sourcify.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}