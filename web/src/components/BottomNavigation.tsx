"use client";
import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Calendar, Settings, Camera, Target } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { formatMonthYM } from '@/lib/date';

interface BottomNavigationProps {
  currentPage?: 'today' | 'calendar' | 'goals' | 'settings';
}

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine current page from pathname
  const getCurrentPage = (): 'today' | 'calendar' | 'goals' | 'settings' => {
    if (currentPage) return currentPage;
    
    if (pathname.startsWith('/upload')) return 'today';
    if (pathname.startsWith('/month/') || pathname.startsWith('/day/')) return 'calendar';
    if (pathname.startsWith('/goals/')) return 'goals';
    if (pathname.startsWith('/settings')) return 'settings';
    
    return 'today'; // default
  };

  const activePage = getCurrentPage();

  const handleNavigate = (page: 'today' | 'calendar' | 'goals' | 'settings') => {
    const currentDate = new Date();
    const today = currentDate.toISOString().split('T')[0];
    const currentMonth = formatMonthYM(currentDate);

    switch (page) {
      case 'today':
        router.push('/upload');
        break;
      case 'calendar':
        router.push(`/month/${currentMonth}`);
        break;
      case 'goals':
        router.push(`/goals/${currentMonth}`);
        break;
      case 'settings':
        router.push('/settings');
        break;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <Card className="border-t border-border bg-background shadow-lg">
        <div className="grid grid-cols-4 gap-1 p-3 max-w-md mx-auto">
          <Button
            variant={activePage === 'today' ? 'default' : 'ghost'}
            size="sm"
            className={`flex flex-col items-center justify-center h-14 gap-1 rounded-lg ${
              activePage === 'today' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            onClick={() => handleNavigate('today')}
          >
            <Camera className="w-5 h-5" />
            <span className="text-xs font-medium">Add Meals</span>
          </Button>
          
          <Button
            variant={activePage === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            className={`flex flex-col items-center justify-center h-14 gap-1 rounded-lg ${
              activePage === 'calendar' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            onClick={() => handleNavigate('calendar')}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-medium">Calendar</span>
          </Button>
          
          <Button
            variant={activePage === 'goals' ? 'default' : 'ghost'}
            size="sm"
            className={`flex flex-col items-center justify-center h-14 gap-1 rounded-lg ${
              activePage === 'goals' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            onClick={() => handleNavigate('goals')}
          >
            <Target className="w-5 h-5" />
            <span className="text-xs font-medium">Goals</span>
          </Button>
          
          <Button
            variant={activePage === 'settings' ? 'default' : 'ghost'}
            size="sm"
            className={`flex flex-col items-center justify-center h-14 gap-1 rounded-lg ${
              activePage === 'settings' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            onClick={() => handleNavigate('settings')}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs font-medium">Settings</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
