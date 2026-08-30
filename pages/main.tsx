import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';

import '@/app/globals.css';
import { XyQuiverShell } from '@/components/xyquiver-shell';

import './pages.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('XyQuiver root element is missing.');
}

createRoot(root).render(<XyQuiverShell />);
