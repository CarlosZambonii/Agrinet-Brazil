import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import Footer from '@/components/Footer';
import ClientLayout from '@/components/ClientLayout';

export const metadata = {
  title: 'Agrinet — Marketplace Agrícola',
  description: 'Compre e venda commodities agrícolas com segurança, escrow garantido e pagamento protegido.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
