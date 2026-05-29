import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      {/* Main content area with proper spacing for sidebar and top bar */}
      <main className="ml-64 pt-16">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
