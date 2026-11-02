'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

// Mount on first activation, then keep drafts and pending submissions alive.
export default function DeferredContent({ active, children }: { active: boolean; children: ReactNode }) {
  const [opened, setOpened] = useState(active);
  if (active && !opened) setOpened(true);
  return active || opened ? children : null;
}
