import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Calendar, 
  ClipboardList, 
  Home, 
  LogOut, 
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/metrics', icon: Activity, label: 'Health Metrics' },
    { path: '/appointments', icon: Calendar, label: 'Appointments' },
    { path: '/health-record', icon: ClipboardList, label: 'Health Record' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 flex flex-col ${isExpanded ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600 flex-shrink-0" />
            {isExpanded && (
              <span className="ml-2 text-xl font-bold text-gray-800">HealthCare</span>
            )}
          </Link>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            {isExpanded ? (
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 p-3 rounded-lg transition-colors duration-200
                  ${isActive 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {isExpanded && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleSignOut}
            className={`flex items-center space-x-2 text-red-600 hover:bg-red-50 p-3 rounded-lg w-full
              ${isExpanded ? 'justify-start' : 'justify-center'}`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isExpanded && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}