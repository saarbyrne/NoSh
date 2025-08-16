import React from 'react';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full bg-background border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-md mx-auto px-6 py-4">
        <div className="text-center">
          <h1 className="text-xl font-medium text-foreground">
            {title}
          </h1>
        </div>
      </div>
    </div>
  );
}