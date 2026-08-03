import { useEffect, useState } from 'react';
import api from '../services/api';

function Overview() {
  const [stats, setStats] = useState({ categories: 0, menuItems: 0, orders: 0, tables: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [categoriesRes, menuItemsRes, ordersRes, tablesRes] = await Promise.allSettled([
          api.get('/categories'),
          api.get('/menu-items'),
          api.get('/orders'),
          api.get('/tables'),
        ]);

        setStats({
          categories: categoriesRes.status === 'fulfilled' ? categoriesRes.value.data.count : 0,
          menuItems: menuItemsRes.status === 'fulfilled' ? menuItemsRes.value.data.count : 0,
          orders: ordersRes.status === 'fulfilled' ? ordersRes.value.data.count : 0,
          tables: tablesRes.status === 'fulfilled' ? tablesRes.value.data.count : 0,
        });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { label: 'Categories', value: stats.categories, color: 'bg-blue-500' },
    { label: 'Menu Items', value: stats.menuItems, color: 'bg-green-500' },
    { label: 'Total Orders', value: stats.orders, color: 'bg-purple-500' },
    { label: 'Tables', value: stats.tables, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Overview</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl shadow p-6">
              <div className={`w-10 h-10 rounded-lg ${card.color} mb-3`}></div>
              <p className="text-3xl font-bold text-gray-800">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Overview;