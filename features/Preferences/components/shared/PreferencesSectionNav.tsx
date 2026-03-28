'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import { Joystick, Palette, Wand2 } from 'lucide-react';

const SECTION_OFFSET = 112;

type SectionId = 'behavior' | 'display' | 'effects';

interface SectionItem {
  id: SectionId;
  label: string;
  icon: typeof Joystick;
}

const sections: SectionItem[] = [
  {
    id: 'behavior',
    label: 'Behavior',
    icon: Joystick,
  },
  {
    id: 'display',
    label: 'Display',
    icon: Palette,
  },
  {
    id: 'effects',
    label: 'Effects',
    icon: Wand2,
  },
];

const PreferencesSectionNav = () => {
  const [activeSection, setActiveSection] = useState<SectionId>('behavior');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sectionElements = sections
      .map(section => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const visibleEntries = entries
          .filter(entry => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top),
          );

        if (visibleEntries.length === 0) return;

        const nextId = visibleEntries[0].target.id as SectionId;
        setActiveSection(nextId);
      },
      {
        rootMargin: '-96px 0px -55% 0px',
        threshold: [0.1, 0.25, 0.5],
      },
    );

    sectionElements.forEach(element => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: SectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) return;

    setActiveSection(sectionId);

    const top =
      section.getBoundingClientRect().top + window.scrollY - SECTION_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div className='sticky top-2 z-40'>
      <div className='mx-auto w-full max-w-fit rounded-2xl border border-(--main-color)/15 bg-(--background-color)/88 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl'>
        <div className='flex w-full gap-0 rounded-2xl bg-(--card-color) p-0'>
          {sections.map(section => {
            const isSelected = activeSection === section.id;
            const Icon = section.icon;

            return (
              <div key={section.id} className='relative flex-1'>
                {isSelected && (
                  <motion.div
                    layoutId='activePreferencesSectionTab'
                    className='absolute inset-0 rounded-2xl border-b-10 border-(--main-color-accent) bg-(--main-color)'
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                    }}
                  />
                )}
                <button
                  type='button'
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    'relative z-10 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 pt-2 pb-4 text-sm font-semibold transition-colors duration-300 sm:px-5',
                    isSelected
                      ? 'text-(--background-color)'
                      : 'text-(--secondary-color)/70 hover:text-(--main-color)',
                  )}
                  aria-label={section.label}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <Icon className='h-5 w-5 shrink-0' />
                  <span className='hidden sm:inline'>{section.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PreferencesSectionNav;
