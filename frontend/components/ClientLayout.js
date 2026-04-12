'use client';
import { useState } from 'react';
import { DesktopNav, MobileTopBar, BottomTabBar } from '@/components/Nav';
import AuthModal from '@/components/auth/AuthModal';
import PageTransition from '@/components/motion/PageTransition';

export default function ClientLayout({ children }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');

  function openAuth(tab = 'login') {
    setAuthTab(tab);
    setAuthOpen(true);
  }

  return (
    <>
      <DesktopNav onOpenAuth={openAuth} />
      <MobileTopBar onOpenAuth={openAuth} />
      <main className="pb-20 md:pb-0">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <BottomTabBar />
      {authOpen && <AuthModal tab={authTab} onClose={() => setAuthOpen(false)} />}
    </>
  );
}
