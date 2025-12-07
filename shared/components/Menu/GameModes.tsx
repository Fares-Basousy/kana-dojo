'use client';
import { useEffect } from 'react';
import useKanaStore from '@/features/Kana/store/useKanaStore';
import useKanjiStore from '@/features/Kanji/store/useKanjiStore';
import useVocabStore from '@/features/Vocabulary/store/useVocabStore';
import { MousePointerClick, Keyboard, Play, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { useClick } from '@/shared/hooks/useAudio';
import { useShallow } from 'zustand/react/shallow';
import { Link } from '@/core/i18n/routing';

interface GameModesProps {
  isOpen: boolean;
  onClose: () => void;
  currentDojo: string;
}

const GameModes = ({ isOpen, onClose, currentDojo }: GameModesProps) => {
  const { playClick } = useClick();

  const { selectedGameModeKana, setSelectedGameModeKana } = useKanaStore(
    useShallow(state => ({
      selectedGameModeKana: state.selectedGameModeKana,
      setSelectedGameModeKana: state.setSelectedGameModeKana
    }))
  );

  const { selectedGameModeKanji, setSelectedGameModeKanji } = useKanjiStore(
    useShallow(state => ({
      selectedGameModeKanji: state.selectedGameModeKanji,
      setSelectedGameModeKanji: state.setSelectedGameModeKanji
    }))
  );

  const { selectedGameModeVocab, setSelectedGameModeVocab } = useVocabStore(
    useShallow(state => ({
      selectedGameModeVocab: state.selectedGameModeVocab,
      setSelectedGameModeVocab: state.setSelectedGameModeVocab
    }))
  );

  const selectedGameMode =
    currentDojo === 'kana'
      ? selectedGameModeKana
      : currentDojo === 'kanji'
      ? selectedGameModeKanji
      : currentDojo === 'vocabulary'
      ? selectedGameModeVocab
      : '';

  const setSelectedGameMode =
    currentDojo === 'kana'
      ? setSelectedGameModeKana
      : currentDojo === 'kanji'
      ? setSelectedGameModeKanji
      : currentDojo === 'vocabulary'
      ? setSelectedGameModeVocab
      : () => {};

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const gameModes = [
    {
      id: 'Pick',
      title: 'Pick',
      description: 'Pick the correct answer from multiple options',
      icon: MousePointerClick
    },
    {
      id: 'Type',
      title: 'Type',
      description: 'Type the correct answer',
      icon: Keyboard
    }
  ];

  const dojoLabel =
    currentDojo === 'kana'
      ? 'Kana'
      : currentDojo === 'kanji'
      ? 'Kanji'
      : 'Vocabulary';

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 bg-[var(--background-color)]'>
      <div className='min-h-[100dvh] flex flex-col items-center justify-center p-4'>
        <div className='max-w-lg w-full space-y-4'>
          {/* Header */}
          <div className='text-center space-y-3'>
            <Play size={56} className='mx-auto text-[var(--main-color)]' />
            <h1 className='text-2xl font-bold text-[var(--secondary-color)]'>
              {dojoLabel} Training
            </h1>
            <p className='text-[var(--muted-color)]'>
              Choose your training mode
            </p>
          </div>

          {/* Game Mode Cards */}
          <div className='space-y-3'>
            {gameModes.map(mode => {
              const isSelected = mode.id === selectedGameMode;
              const Icon = mode.icon;

              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    playClick();
                    setSelectedGameMode(mode.id);
                  }}
                  className={clsx(
                    'w-full p-5 rounded-xl text-left transition-all hover:cursor-pointer',
                    'border-2 flex items-center gap-4',
                    isSelected
                      ? 'border-[var(--main-color)] bg-[var(--main-color)]/10'
                      : 'border-[var(--border-color)] bg-[var(--card-color)] hover:border-[var(--main-color)]/50'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={clsx(
                      'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                      isSelected
                        ? 'bg-[var(--main-color)] text-white'
                        : 'bg-[var(--border-color)] text-[var(--muted-color)]'
                    )}
                  >
                    <Icon size={24} />
                  </div>

                  {/* Content */}
                  <div className='flex-1 min-w-0'>
                    <h3
                      className={clsx(
                        'text-lg font-semibold',
                        isSelected
                          ? 'text-[var(--main-color)]'
                          : 'text-[var(--secondary-color)]'
                      )}
                    >
                      {mode.title}
                    </h3>
                    <p className='text-sm text-[var(--muted-color)] mt-0.5'>
                      {mode.description}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
                      isSelected
                        ? 'border-[var(--main-color)] bg-[var(--main-color)]'
                        : 'border-[var(--border-color)]'
                    )}
                  >
                    {isSelected && (
                      <svg
                        className='w-3 h-3 text-white'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={3}
                          d='M5 13l4 4L19 7'
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className='flex flex-row items-center justify-center gap-2 md:gap-4 w-full max-w-4xl mx-auto'>
            <button
              className={clsx(
                'w-1/2 h-12 px-2 sm:px-6 flex flex-row justify-center items-center gap-2',
                'bg-[var(--secondary-color)] text-[var(--background-color)]',
                'rounded-2xl transition-colors duration-200',
                'border-b-6 border-[var(--secondary-color-accent)] shadow-sm',
                'hover:cursor-pointer'
              )}
              onClick={() => {
                playClick();
                onClose();
              }}
            >
              <ArrowLeft size={20} />
              <span className='whitespace-nowrap'>Back</span>
            </button>

            {/* Start Training Button */}
            <Link
              href={`/${currentDojo}/train`}
              className='w-1/2'
              onClick={e => {
                if (!selectedGameMode) {
                  e.preventDefault();
                  return;
                }
                playClick();
              }}
            >
              <button
                disabled={!selectedGameMode}
                className={clsx(
                  'w-full h-12 px-2 sm:px-6 flex flex-row justify-center items-center gap-2',
                  'rounded-2xl transition-colors duration-200',
                  'font-medium border-b-6 shadow-sm',
                  'hover:cursor-pointer',
                  selectedGameMode
                    ? 'bg-[var(--main-color)] text-[var(--background-color)] border-[var(--main-color-accent)]'
                    : 'bg-[var(--card-color)] text-[var(--border-color)] cursor-not-allowed'
                )}
              >
                <span className='whitespace-nowrap'>Start Training</span>
                <Play
                  className={clsx(selectedGameMode && 'fill-current')}
                  size={20}
                />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModes;
