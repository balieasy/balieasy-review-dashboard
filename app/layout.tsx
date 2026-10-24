import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'BaliEasy · Review Monitor', description:'Pantau reputasi, pertumbuhan review, dan balasan di seluruh lokasi BaliEasy.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="id"><body>{children}</body></html>; }
