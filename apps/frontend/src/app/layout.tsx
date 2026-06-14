import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Analytics Canvas MVP',
  description: 'An amazing dashboard builder for resumes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}