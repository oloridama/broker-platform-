import { Link } from "react-router-dom";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-broker-900 p-4 text-center">
      <div className="w-20 h-20 rounded-full bg-broker-800 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
      </div>
      <h1 className="text-fluid-4xl font-bold text-white mb-2">404</h1>
      <p className="text-fluid-lg text-broker-400 mb-8">Page not found</p>
      <Link to="/dashboard" className="btn-primary gap-2">
        <Home className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
