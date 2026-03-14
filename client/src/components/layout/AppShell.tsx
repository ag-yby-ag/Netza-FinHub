import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppShell: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F7F7] dark:bg-[#0D0D0D]">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-[#6DED67] focus:px-4 focus:py-2 focus:text-[#0D0D0D] focus:font-semibold"
      >
        Pular para o conteúdo
      </a>

      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
        >
          <div className="mx-auto max-w-[960px] px-8 py-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
