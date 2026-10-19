import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getCustomers } from '../lib/api';
import { Plus, Building2 } from 'lucide-react';
import { Button, Badge, Card } from '@vibe-pos/ui-kit';

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  past_due: 'warning',
  suspended: 'destructive',
};

export default function CustomerListPage() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-gray-400 text-sm mt-1">Manage POS tenant profiles and configurations</p>
        </div>
        <Link to="/customers/new">
          <Button className="flex items-center gap-2">
            <Plus size={16} /> New Customer
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading customers...</p>
      ) : customers.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <Building2 size={48} className="mx-auto mb-4 opacity-30 text-gray-400" />
          <p className="text-gray-400 font-medium">No customers yet</p>
          <p className="text-gray-600 text-sm mt-1">Create your first customer to configure their POS</p>
          <Link to="/customers/new" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">Create Customer</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map((c: Record<string, string>) => (
            <Link
              key={c.id}
              to={`/customers/${c.id}`}
              className="block"
            >
              <Card className="p-5 flex items-center justify-between hover:bg-gray-800/60 transition cursor-pointer">
                <div>
                  <p className="text-white font-medium text-base">{c.name}</p>
                  <p className="text-gray-500 text-sm capitalize">{c.businessType}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 font-mono">{c.id}</span>
                  <Badge variant={STATUS_VARIANTS[c.licenseStatus] || 'secondary'}>
                    {c.licenseStatus}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
