import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div>
      <h2 className="page-title">Page not found</h2>
      <div className="card">
        <p>The page you are looking for does not exist or has been moved.</p>
        <Link to="/dashboard" className="button">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
