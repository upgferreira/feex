import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40 h-7">
      <div className="flex items-center justify-center h-full px-6">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          FEEX | ARCA SYSTEMS LTDA | ARCA HOLD LLC @2025
        </div>
      </div>
    </footer>
  );
};