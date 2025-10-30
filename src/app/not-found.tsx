import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center px-4">
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-bold font-vt323 text-cerulean-blue-500">404</h1>
          <div className="mt-4 text-2xl md:text-3xl font-semibold text-gray-800">Page Not Found</div>
        </div>

        <p className="text-gray-600 text-base md:text-lg mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white py-3 px-6 rounded-md transition-colors font-medium"
          >
            Go to Home
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Looking for something specific?</p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link
              href="https://docs.sourcify.dev/docs/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cerulean-blue-600 hover:text-cerulean-blue-700 hover:underline"
            >
              API Documentation
            </Link>
            <Link
              href="https://sourcify.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cerulean-blue-600 hover:text-cerulean-blue-700 hover:underline"
            >
              Sourcify Main Site
            </Link>
            <Link
              href="https://github.com/sourcifyeth/4byte.sourcify.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cerulean-blue-600 hover:text-cerulean-blue-700 hover:underline"
            >
              GitHub Repository
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
