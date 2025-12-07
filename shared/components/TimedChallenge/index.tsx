'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useChallengeTimer } from '@/shared/hooks/useTimer';
import { useGoalTimers } from '@/shared/hooks/useGoalTimers';
import { useClick, useCorrect, useError } from '@/shared/hooks/useAudio';
import {
  Timer,
  Target,
  TrendingUp,
  RotateCcw,
  Play,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import { Link } from '@/core/i18n/routing';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import SSRAudioButton from '@/shared/components/SSRAudioButton';
import GoalTimersPanel from '@/shared/components/Timer/GoalTimersPanel';

export interface TimedChallengeConfig<T> {
  // Identity
  dojoType: 'kana' | 'kanji' | 'vocabulary';
  dojoLabel: string;
  localStorageKey: string;
  goalTimerContext: string;

  // Data
  items: T[];
  generateQuestion: (items: T[]) => T;

  // Display
  renderQuestion: (question: T) => React.ReactNode;
  getAudioText: (question: T) => string;
  inputPlaceholder: string;
  modeDescription: string;

  // Validation
  checkAnswer: (question: T, answer: string) => boolean;
  getCorrectAnswer: (question: T) => string;

  // Stats
  stats: {
    correct: number;
    wrong: number;
    streak: number;
    bestStreak: number;
    incrementCorrect: () => void;
    incrementWrong: () => void;
    reset: () => void;
  };
}

interface TimedChallengeProps<T> {
  config: TimedChallengeConfig<T>;
}

export default function TimedChallenge<T>({ config }: TimedChallengeProps<T>) {
  const { playClick } = useClick();
  const { playCorrect } = useCorrect();
  const { playError } = useError();

  const {
    dojoType,
    dojoLabel,
    localStorageKey,
    goalTimerContext,
    items,
    generateQuestion,
    renderQuestion,
    getAudioText,
    inputPlaceholder,
    modeDescription,
    checkAnswer,
    getCorrectAnswer,
    stats
  } = config;

  // Load saved duration from localStorage
  const [challengeDuration, setChallengeDuration] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(localStorageKey);
      return saved ? parseInt(saved) : 60;
    }
    return 60;
  });

  // Save duration to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(localStorageKey, challengeDuration.toString());
    }
  }, [challengeDuration, localStorageKey]);

  const { seconds, minutes, isRunning, startTimer, resetTimer, timeLeft } =
    useChallengeTimer(challengeDuration);

  const [currentQuestion, setCurrentQuestion] = useState<T | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(
    null
  );
  const [showGoalTimers, setShowGoalTimers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate elapsed time for goal timers
  const elapsedTime = challengeDuration - timeLeft;

  // Goal Timers with history saving enabled
  const goalTimers = useGoalTimers(elapsedTime, {
    enabled: showGoalTimers,
    saveToHistory: true,
    context: goalTimerContext,
    onGoalReached: goal => {
      console.log(`🎯 Goal reached: ${goal.label} at ${elapsedTime}s`);
    }
  });

  useEffect(() => {
    if (items.length > 0) {
      setCurrentQuestion(generateQuestion(items));
    }
  }, [items, generateQuestion]);

  useEffect(() => {
    if (timeLeft === 0 && !isFinished) {
      setIsFinished(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, [timeLeft, isFinished]);

  useEffect(() => {
    if (isRunning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRunning, currentQuestion]);

  const handleStart = () => {
    playClick();
    stats.reset();
    setIsFinished(false);
    setUserAnswer('');
    setLastAnswerCorrect(null);
    setCurrentQuestion(generateQuestion(items));
    goalTimers.resetGoals();
    resetTimer();
    setTimeout(() => startTimer(), 50);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  };

  const handleCancel = () => {
    playClick();
    resetTimer();
    setIsFinished(false);
    setUserAnswer('');
    setLastAnswerCorrect(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentQuestion || !userAnswer.trim()) return;
    playClick();

    const isCorrect = checkAnswer(currentQuestion, userAnswer.trim());

    if (isCorrect) {
      playCorrect();
      stats.incrementCorrect();
      setLastAnswerCorrect(true);
      setTimeout(() => {
        setCurrentQuestion(generateQuestion(items));
        setLastAnswerCorrect(null);
      }, 300);
    } else {
      playError();
      stats.incrementWrong();
      setLastAnswerCorrect(false);
      setTimeout(() => setLastAnswerCorrect(null), 800);
    }
    setUserAnswer('');
  };

  const totalAnswers = stats.correct + stats.wrong;
  const accuracy =
    totalAnswers > 0 ? Math.round((stats.correct / totalAnswers) * 100) : 0;

  // Empty state - no items selected
  if (items.length === 0) {
    return (
      <div className='min-h-[100dvh] flex flex-col items-center justify-center p-4'>
        <div className='max-w-md text-center space-y-6'>
          <Timer size={64} className='mx-auto text-[var(--main-color)]' />
          <h1 className='text-2xl font-bold text-[var(--secondary-color)]'>
            Timed Challenge
          </h1>
          <p className='text-[var(--muted-color)]'>
            Please select some {dojoLabel.toLowerCase()} first to begin the
            timed challenge.
          </p>
          <Link href={`/${dojoType}`}>
            <button
              className={clsx(
                'w-full h-12 px-6 flex flex-row justify-center items-center gap-2',
                'bg-[var(--secondary-color)] text-[var(--background-color)]',
                'rounded-2xl transition-colors duration-200',
                'border-b-6 border-[var(--secondary-color-accent)] shadow-sm',
                'hover:cursor-pointer'
              )}
            >
              <ArrowLeft size={20} />
              <span>Select {dojoLabel}</span>
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Pre-game interstitial
  if (!isRunning && !isFinished) {
    return (
      <div className='min-h-[100dvh] flex flex-col lg:flex-row items-start justify-center p-4 gap-6'>
        <div className='max-w-md w-full lg:max-w-lg text-center space-y-6'>
          <Timer size={64} className='mx-auto text-[var(--main-color)]' />
          <h1 className='text-2xl font-bold text-[var(--secondary-color)]'>
            Timed Challenge
          </h1>
          <p className='text-[var(--muted-color)]'>
            Test your {dojoLabel.toLowerCase()} recognition speed! Answer as
            many questions as possible before time runs out.
          </p>

          <div className='bg-[var(--card-color)] rounded-lg p-4 space-y-2'>
            <p className='text-sm text-[var(--muted-color)]'>Selected:</p>
            <p className='font-medium text-[var(--secondary-color)]'>
              {items.length} {dojoLabel.toLowerCase()}
            </p>
          </div>

          <div className='bg-[var(--card-color)] rounded-lg p-3'>
            <p className='text-sm text-[var(--main-color)] font-medium'>
              ℹ️ {modeDescription}
            </p>
          </div>

          <div className='bg-[var(--card-color)] rounded-lg p-4 space-y-3'>
            <p className='text-sm font-medium text-[var(--secondary-color)]'>
              Challenge Duration:
            </p>
            <div className='flex gap-2 justify-center flex-wrap'>
              {[30, 60, 90, 120, 180].map(duration => (
                <button
                  key={duration}
                  onClick={() => {
                    playClick();
                    setChallengeDuration(duration);
                  }}
                  className={clsx(
                    'px-4 py-2 rounded-lg border-2 transition-all',
                    challengeDuration === duration
                      ? 'border-[var(--main-color)] bg-[var(--main-color)]/10 text-[var(--main-color)] font-bold'
                      : 'border-[var(--border-color)] hover:bg-[var(--border-color)]'
                  )}
                >
                  {duration < 60 ? `${duration}s` : `${duration / 60}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons - Styled like GameModes */}
          <div className='flex flex-row items-center justify-center gap-2 md:gap-4 w-full'>
            <Link href={`/${dojoType}`} className='w-1/2'>
              <button
                className={clsx(
                  'w-full h-12 px-2 sm:px-6 flex flex-row justify-center items-center gap-2',
                  'bg-[var(--secondary-color)] text-[var(--background-color)]',
                  'rounded-2xl transition-colors duration-200',
                  'border-b-6 border-[var(--secondary-color-accent)] shadow-sm',
                  'hover:cursor-pointer'
                )}
                onClick={() => playClick()}
              >
                <ArrowLeft size={20} />
                <span className='whitespace-nowrap'>Back</span>
              </button>
            </Link>
            <button
              onClick={handleStart}
              className={clsx(
                'w-1/2 h-12 px-2 sm:px-6 flex flex-row justify-center items-center gap-2',
                'bg-[var(--main-color)] text-[var(--background-color)]',
                'rounded-2xl transition-colors duration-200',
                'font-medium border-b-6 border-[var(--main-color-accent)] shadow-sm',
                'hover:cursor-pointer'
              )}
            >
              <span className='whitespace-nowrap'>Start</span>
              <Play size={20} className='fill-current' />
            </button>
          </div>
        </div>

        {/* Goal Timers Panel */}
        <div className='w-full lg:w-80 space-y-4'>
          <button
            onClick={() => setShowGoalTimers(!showGoalTimers)}
            className={clsx(
              'w-full px-4 py-2 border-2 rounded-xl transition-colors',
              'border-[var(--border-color)] hover:bg-[var(--border-color)]',
              'flex items-center justify-center gap-2'
            )}
          >
            <Target size={20} />
            <span>{showGoalTimers ? 'Hide' : 'Show'} Goal Timers</span>
          </button>
          {showGoalTimers && (
            <GoalTimersPanel
              goals={goalTimers.goals}
              currentSeconds={0}
              onAddGoal={goalTimers.addGoal}
              onRemoveGoal={goalTimers.removeGoal}
              onClearGoals={goalTimers.clearGoals}
              disabled={false}
            />
          )}
        </div>
      </div>
    );
  }

  // Finished state - results modal
  if (isFinished) {
    const reachedGoals = goalTimers.goals.filter(g => g.reached);
    const missedGoals = goalTimers.goals.filter(g => !g.reached);
    const questionsPerMinute =
      totalAnswers > 0
        ? ((totalAnswers / challengeDuration) * 60).toFixed(1)
        : '0';

    return (
      <div className='fixed inset-0 z-50 bg-[var(--background-color)]'>
        <div className='min-h-[100dvh] flex flex-col items-center justify-center p-4'>
          <div className='max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6'>
            {/* Header */}
            <div className='text-center space-y-2'>
              <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--main-color)]/10 mb-4'>
                <Timer size={48} className='text-[var(--main-color)]' />
              </div>
              <h1 className='text-3xl font-bold text-[var(--secondary-color)]'>
                Challenge Complete!
              </h1>
              <p className='text-[var(--muted-color)]'>
                {challengeDuration < 60
                  ? `${challengeDuration} seconds`
                  : `${challengeDuration / 60} minute${
                      challengeDuration > 60 ? 's' : ''
                    }`}{' '}
                challenge finished
              </p>
            </div>

            {/* Main Stats Grid */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='bg-[var(--card-color)] rounded-xl p-4 text-center space-y-2 border-2 border-[var(--border-color)]'>
                <Target className='mx-auto text-green-500' size={28} />
                <p className='text-3xl font-bold text-green-500'>
                  {stats.correct}
                </p>
                <p className='text-sm text-[var(--muted-color)]'>Correct</p>
              </div>
              <div className='bg-[var(--card-color)] rounded-xl p-4 text-center space-y-2 border-2 border-[var(--border-color)]'>
                <XCircle className='mx-auto text-red-500' size={28} />
                <p className='text-3xl font-bold text-red-500'>{stats.wrong}</p>
                <p className='text-sm text-[var(--muted-color)]'>Wrong</p>
              </div>
              <div className='bg-[var(--card-color)] rounded-xl p-4 text-center space-y-2 border-2 border-[var(--border-color)]'>
                <TrendingUp
                  className='mx-auto text-[var(--main-color)]'
                  size={28}
                />
                <p className='text-3xl font-bold text-[var(--main-color)]'>
                  {accuracy}%
                </p>
                <p className='text-sm text-[var(--muted-color)]'>Accuracy</p>
              </div>
              <div className='bg-[var(--card-color)] rounded-xl p-4 text-center space-y-2 border-2 border-[var(--border-color)]'>
                <Timer className='mx-auto text-blue-500' size={28} />
                <p className='text-3xl font-bold text-blue-500'>
                  {questionsPerMinute}
                </p>
                <p className='text-sm text-[var(--muted-color)]'>Q/Min</p>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='bg-[var(--card-color)] rounded-lg p-4 space-y-2 border border-[var(--border-color)]'>
                <p className='text-sm text-[var(--muted-color)]'>Best Streak</p>
                <p className='text-2xl font-bold text-[var(--secondary-color)]'>
                  🔥 {stats.bestStreak}
                </p>
              </div>
              <div className='bg-[var(--card-color)] rounded-lg p-4 space-y-2 border border-[var(--border-color)]'>
                <p className='text-sm text-[var(--muted-color)]'>
                  Total Answers
                </p>
                <p className='text-2xl font-bold text-[var(--secondary-color)]'>
                  {totalAnswers}
                </p>
              </div>
            </div>

            {/* Goal Timers Statistics */}
            {showGoalTimers && goalTimers.goals.length > 0 && (
              <div className='bg-[var(--card-color)] rounded-lg p-4 space-y-3 text-left border border-[var(--border-color)]'>
                <div className='flex items-center gap-2 justify-center'>
                  <Target className='text-[var(--main-color)]' size={20} />
                  <h3 className='text-lg font-semibold text-[var(--secondary-color)]'>
                    Goal Timers Results
                  </h3>
                </div>
                {reachedGoals.length > 0 && (
                  <div className='space-y-2'>
                    <p className='text-sm font-medium text-green-500 flex items-center gap-2'>
                      <CheckCircle2 size={16} />
                      Reached ({reachedGoals.length})
                    </p>
                    <div className='space-y-1.5'>
                      {reachedGoals.map(goal => (
                        <div
                          key={goal.id}
                          className='flex items-center justify-between text-sm p-2 rounded bg-green-500/10 border border-green-500/20'
                        >
                          <span className='text-[var(--secondary-color)]'>
                            {goal.label}
                          </span>
                          <span className='text-green-500 font-mono'>
                            {Math.floor(goal.targetSeconds / 60)}:
                            {(goal.targetSeconds % 60)
                              .toString()
                              .padStart(2, '0')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {missedGoals.length > 0 && (
                  <div className='space-y-2'>
                    <p className='text-sm font-medium text-[var(--muted-color)] flex items-center gap-2'>
                      <XCircle size={16} />
                      Not Reached ({missedGoals.length})
                    </p>
                    <div className='space-y-1.5'>
                      {missedGoals.map(goal => (
                        <div
                          key={goal.id}
                          className='flex items-center justify-between text-sm p-2 rounded bg-[var(--border-color)] opacity-60'
                        >
                          <span className='text-[var(--muted-color)]'>
                            {goal.label}
                          </span>
                          <span className='text-[var(--muted-color)] font-mono'>
                            {Math.floor(goal.targetSeconds / 60)}:
                            {(goal.targetSeconds % 60)
                              .toString()
                              .padStart(2, '0')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className='flex flex-row items-center justify-center gap-2 md:gap-4 w-full'>
              <Link href={`/${dojoType}`} className='w-1/2'>
                <button
                  className={clsx(
                    'w-full h-12 px-2 sm:px-6 flex flex-row justify-center items-center gap-2',
                    'bg-[var(--secondary-color)] text-[var(--background-color)]',
                    'rounded-2xl transition-colors duration-200',
                    'border-b-6 border-[var(--secondary-color-accent)] shadow-sm',
                    'hover:cursor-pointer'
                  )}
                  onClick={() => playClick()}
                >
                  <ArrowLeft size={20} />
                  <span className='whitespace-nowrap'>Back</span>
                </button>
              </Link>
              <button
                onClick={handleStart}
                className={clsx(
                  'w-1/2 h-12 px-2 sm:px-6 flex flex-row justify-center items-center gap-2',
                  'bg-[var(--main-color)] text-[var(--background-color)]',
                  'rounded-2xl transition-colors duration-200',
                  'font-medium border-b-6 border-[var(--main-color-accent)] shadow-sm',
                  'hover:cursor-pointer'
                )}
              >
                <RotateCcw size={20} />
                <span className='whitespace-nowrap'>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active game state
  return (
    <div className='min-h-[100dvh] flex flex-col lg:flex-row items-start justify-center p-4 gap-6'>
      <div className='max-w-md w-full lg:max-w-lg space-y-6'>
        {/* Header with timer, stats, and cancel button */}
        <div className='flex justify-between items-center'>
          <div className='flex items-center gap-2'>
            <Timer className='text-[var(--main-color)]' size={20} />
            <span
              className={clsx(
                'text-lg font-bold',
                timeLeft <= 10
                  ? 'text-red-500 animate-pulse'
                  : 'text-[var(--secondary-color)]'
              )}
            >
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-right text-sm text-[var(--muted-color)]'>
              <div>Score: {stats.correct}</div>
              <div>Streak: {stats.streak}</div>
            </div>
            <button
              onClick={handleCancel}
              className={clsx(
                'p-2 rounded-lg border-2 border-red-500/50 hover:bg-red-500/10 transition-colors'
              )}
              title='Cancel challenge'
            >
              <X size={20} className='text-red-500' />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className='w-full bg-[var(--border-color)] rounded-full h-2'>
          <div
            className='bg-[var(--main-color)] h-2 rounded-full transition-all duration-1000'
            style={{
              width: `${
                ((challengeDuration - timeLeft) / challengeDuration) * 100
              }%`
            }}
          />
        </div>

        {/* Current question */}
        <div className='text-center space-y-4'>
          <div className='flex flex-col items-center gap-4'>
            <div
              className={clsx(
                'text-6xl md:text-8xl font-bold transition-all duration-200',
                lastAnswerCorrect === true && 'text-green-500',
                lastAnswerCorrect === false && 'text-red-500',
                lastAnswerCorrect === null && 'text-[var(--secondary-color)]'
              )}
            >
              {currentQuestion && renderQuestion(currentQuestion)}
            </div>
            {currentQuestion && (
              <SSRAudioButton
                text={getAudioText(currentQuestion)}
                variant='icon-only'
                size='lg'
                className='bg-[var(--card-color)] border-[var(--border-color)]'
              />
            )}
          </div>

          {/* Feedback */}
          {lastAnswerCorrect !== null && currentQuestion && (
            <div
              className={clsx(
                'text-sm font-medium',
                lastAnswerCorrect ? 'text-green-500' : 'text-red-500'
              )}
            >
              {lastAnswerCorrect
                ? '✓ Correct!'
                : `✗ Incorrect! It was "${getCorrectAnswer(currentQuestion)}"`}
            </div>
          )}
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className='space-y-4'>
          <input
            ref={inputRef}
            type='text'
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSubmit()}
            className='w-full p-4 text-lg text-center border-2 border-[var(--border-color)] rounded-lg bg-[var(--card-color)] text-[var(--secondary-color)] focus:border-[var(--main-color)] focus:outline-none'
            placeholder={inputPlaceholder}
            autoComplete='off'
            autoFocus
          />
          <button
            type='submit'
            disabled={!userAnswer.trim()}
            className={clsx(
              'w-full h-12 px-6 flex flex-row justify-center items-center gap-2',
              'rounded-2xl transition-colors duration-200',
              'font-medium border-b-6 shadow-sm',
              userAnswer.trim()
                ? 'bg-[var(--main-color)] text-[var(--background-color)] border-[var(--main-color-accent)] hover:cursor-pointer'
                : 'bg-[var(--card-color)] text-[var(--border-color)] border-[var(--border-color)] cursor-not-allowed'
            )}
          >
            Submit
          </button>
        </form>

        {/* Real-time stats */}
        <div className='grid grid-cols-3 gap-2 text-center text-sm'>
          <div className='bg-[var(--card-color)] rounded p-2'>
            <div className='text-green-500 font-bold'>{stats.correct}</div>
            <div className='text-[var(--muted-color)]'>Correct</div>
          </div>
          <div className='bg-[var(--card-color)] rounded p-2'>
            <div className='text-red-500 font-bold'>{stats.wrong}</div>
            <div className='text-[var(--muted-color)]'>Wrong</div>
          </div>
          <div className='bg-[var(--card-color)] rounded p-2'>
            <div className='text-[var(--main-color)] font-bold'>
              {accuracy}%
            </div>
            <div className='text-[var(--muted-color)]'>Accuracy</div>
          </div>
        </div>
      </div>

      {/* Goal Timers Sidebar - During Game */}
      {showGoalTimers && goalTimers.goals.length > 0 && (
        <div className='w-full lg:w-80 space-y-4'>
          <GoalTimersPanel
            goals={goalTimers.goals}
            currentSeconds={elapsedTime}
            onAddGoal={goalTimers.addGoal}
            onRemoveGoal={goalTimers.removeGoal}
            onClearGoals={goalTimers.clearGoals}
            disabled={true}
          />
          {goalTimers.nextGoal && (
            <div
              className={clsx(
                'p-4 border-2 rounded-xl',
                'border-[var(--main-color)] bg-[var(--main-color)]/5'
              )}
            >
              <div className='flex items-center gap-2 mb-2'>
                <Target size={16} className='text-[var(--main-color)]' />
                <p className='text-sm text-[var(--secondary-color)] font-medium'>
                  Next Goal
                </p>
              </div>
              <p className='font-bold text-[var(--main-color)] mb-2'>
                {goalTimers.nextGoal.label}
              </p>
              <div className='w-full bg-[var(--border-color)] rounded-full h-2'>
                <div
                  className='bg-[var(--main-color)] h-2 rounded-full transition-all'
                  style={{ width: `${goalTimers.progressToNextGoal}%` }}
                />
              </div>
              <p className='text-xs text-[var(--secondary-color)] mt-1 text-center'>
                {Math.floor(goalTimers.nextGoal.targetSeconds / 60)}:
                {(goalTimers.nextGoal.targetSeconds % 60)
                  .toString()
                  .padStart(2, '0')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
