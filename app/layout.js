import './globals.css';

export const metadata = {
  title: 'Aksanu Exam',
  description: 'Sistem ujian online',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
