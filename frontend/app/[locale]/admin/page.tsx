"use client";
import React, { useEffect, useState } from "react";
import { getAdminStats, getRecentOrders, AdminStats, Order } from "@/lib/services/admin.service";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingBag, Wrench, Tag, FileText, ArrowUpRight, ArrowDownRight, Settings } from "lucide-react";

// Mock data for the chart to make it look real
const monthlySalesData = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  { name: 'Mar', sales: 5000 },
  { name: 'Apr', sales: 4500 },
  { name: 'May', sales: 6000 },
  { name: 'Jun', sales: 7200 },
  { name: 'Jul', sales: 8500 },
];

export default function AdminDashboardOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, ordersData] = await Promise.all([
          getAdminStats(),
          getRecentOrders(5),
        ]);
        setStats(statsData);
        setRecentOrders(ordersData);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "processing" || s === "pending") return "bg-blue-100 text-blue-700";
    if (s === "completed" || s === "delivered") return "bg-green-100 text-green-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500 animate-pulse">Loading dashboard data...</div>;
  }

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Dashboard Overview</h1>
          <p className="text-gray-500 text-sm">Welcome back. Here's what's happening today.</p>
        </div>
        <button className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-blue-50 transition-colors">
          <FileText size={16} />
          Export Report
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        {/* Stat 1: Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <DollarSign size={20} />
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 ${stats?.salesGrowth && stats.salesGrowth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {stats?.salesGrowth && stats.salesGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(stats?.salesGrowth || 0)}%
            </span>
          </div>
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-1">TOTAL SALES</div>
          <div className="text-2xl font-bold text-gray-900">
            ${(stats?.totalSales || 0).toLocaleString()} <span className="text-sm font-medium text-gray-400">USD</span>
          </div>
        </div>

        {/* Stat 2: Total Orders */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              <ShoppingBag size={20} />
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 ${stats?.ordersGrowth && stats.ordersGrowth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {stats?.ordersGrowth && stats.ordersGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(stats?.ordersGrowth || 0)}%
            </span>
          </div>
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-1">TOTAL ORDERS</div>
          <div className="text-2xl font-bold text-gray-900">{(stats?.totalOrders || 0).toLocaleString()}</div>
        </div>

        {/* Stat 3: Pending Repairs */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
              <Wrench size={20} />
            </div>
            {stats?.pendingRepairs ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-red-100 text-red-700">Needs Action</span>
            ) : null}
          </div>
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-1">PENDING REPAIRS</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.pendingRepairs || 0}</div>
        </div>

        {/* Stat 4: Active Promotions */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
              <Tag size={20} />
            </div>
          </div>
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-1">ACTIVE PROMOTIONS</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.activePromotions || 0}</div>
        </div>
      </div>

      {/* Middle Row: Charts & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Sales Performance</h2>
            <select className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-600 outline-none focus:ring-2 focus:ring-blue-100">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySalesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dx={-10} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#1a4fa0', fontWeight: 'bold' }}
                  formatter={(value: any) => [
                    `$${Number(value).toLocaleString()}`,
                    "Revenue"
                  ]}
                />
                <Line type="monotone" dataKey="sales" stroke="#1a4fa0" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & System Status */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              <a href="/admin/products/new" className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600">
                  <ShoppingBag size={18} />
                </div>
                <span className="text-sm font-semibold text-gray-700">Add New Product</span>
              </a>
              <a href="/admin/repairs" className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-red-100 group-hover:text-red-600">
                  <Wrench size={18} />
                </div>
                <span className="text-sm font-semibold text-gray-700 flex-1">View Pending Repairs</span>
                {stats?.pendingRepairs ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">{stats.pendingRepairs}</span>
                ) : null}
              </a>
              <a href="/admin/settings" className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-white">
                  <Settings size={18} />
                </div>
                <span className="text-sm font-semibold text-gray-700">System Settings</span>
              </a>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">System Status</h2>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Server Load</span>
                <span className="text-sm font-bold text-gray-900">42%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "42%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Storage Capacity</span>
                <span className="text-sm font-bold text-gray-900">88%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-red-600 rounded-full" style={{ width: "88%" }}></div>
              </div>
              <span className="text-xs text-red-600 font-medium">Warning: Nearing capacity threshold.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-10">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
          <a href="/admin/orders" className="text-sm font-semibold text-blue-600 hover:text-blue-800">View All</a>
        </div>
        
        {recentOrders.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No recent orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-gray-900">{order.order_id}</td>
                    <td className="p-4 text-sm text-gray-600">{order.customer_name}</td>
                    <td className="p-4 text-sm text-gray-500">{formatDate(order.created_at)}</td>
                    <td className="p-4 text-sm font-bold text-gray-900">${Number(order.total_amount).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
