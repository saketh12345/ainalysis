
export default function Footer() {
  return (
    <footer className="border-t border-gray-200 py-6 mt-auto">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} MediView AI. All rights reserved.
        </p>
        <div className="text-sm text-gray-400">
          <p>This tool is for informational purposes only and does not provide medical advice.</p>
          <p>Always consult with a healthcare professional about your medical reports.</p>
        </div>
      </div>
    </footer>
  );
}
