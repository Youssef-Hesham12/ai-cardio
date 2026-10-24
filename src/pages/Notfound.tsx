import { Go, EmptyState } from '@/components/shared';
export default function Notfound() { return <div className="login-page"><EmptyState title="404 · Page not found" detail="This page doesn't exist in the doctor portal." action={<Go to="/dashboard">Go to dashboard</Go>} /></div>; }
